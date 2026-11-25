"""API de suivi des cours particuliers (utilisée par l'app mobile).

Lancer :  python app.py
"""
import calendar
import datetime
import hashlib
import hmac
import os
import secrets
import sqlite3
import time
import uuid

from flask import Flask, jsonify, request, send_from_directory
from itsdangerous import BadSignature, URLSafeTimedSerializer

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "database.db")
WEB_DIR = os.path.join(BASE_DIR, "web")  # version web de l'app (npm run build:web)

# Mot de passe : écris-le seul dans un fichier mot_de_passe.txt à côté de app.py.
# Sans ce fichier (sur ton PC par exemple), l'app ne demande pas de mot de passe.
PASSWORD_FILE = os.path.join(BASE_DIR, "mot_de_passe.txt")
SECRET_FILE = os.path.join(BASE_DIR, "secret_key.txt")
TOKEN_MAX_AGE = 180 * 24 * 3600  # rester connectée 6 mois

# Montant d'une séance : durée x tarif (figé à la fin de la séance, sinon tarif de l'élève)
AMOUNT = "sessions.duration_hours * COALESCE(sessions.rate, students.hourly_rate)"

STUDENT_SELECT = """
SELECT s.*,
  COALESCE((SELECT SUM(duration_hours) FROM sessions
            WHERE student_id = s.id AND status = 'done'), 0) AS total_hours,
  COALESCE((SELECT SUM(duration_hours * COALESCE(rate, s.hourly_rate)) FROM sessions
            WHERE student_id = s.id AND status = 'done'), 0) AS total_earned,
  COALESCE((SELECT SUM(duration_hours * COALESCE(rate, s.hourly_rate)) FROM sessions
            WHERE student_id = s.id AND status = 'done' AND via_agency = 0), 0) AS direct_earned,
  COALESCE((SELECT SUM(duration_hours * COALESCE(rate, s.hourly_rate)) FROM sessions
            WHERE student_id = s.id AND status = 'done' AND via_agency = 1
              AND agency_paid_at IS NULL), 0) AS agency_pending,
  COALESCE((SELECT SUM(amount) FROM payments WHERE student_id = s.id), 0) AS total_paid,
  (SELECT COUNT(*) FROM items WHERE student_id = s.id
     AND kind = 'difficulty' AND done_at IS NULL) AS open_difficulties,
  (SELECT date FROM sessions WHERE student_id = s.id AND status = 'planned'
     ORDER BY date, COALESCE(time, '') LIMIT 1) AS next_date,
  (SELECT time FROM sessions WHERE student_id = s.id AND status = 'planned'
     ORDER BY date, COALESCE(time, '') LIMIT 1) AS next_time
FROM students s
"""

SESSION_SELECT = f"""
SELECT sessions.*, students.name AS student_name, students.level AS student_level,
  {AMOUNT} AS amount
FROM sessions JOIN students ON students.id = sessions.student_id
"""

PAYMENT_SELECT = """
SELECT payments.*, students.name AS student_name
FROM payments JOIN students ON students.id = payments.student_id
"""

# Colonnes ajoutées depuis la première version : ajoutées automatiquement
# à une base existante, sans perdre les données.
NEW_COLUMNS = {
    "students": [
        ("subject", "TEXT"),
        ("via_progretudes", "INTEGER NOT NULL DEFAULT 0"),
    ],
    "sessions": [
        ("time", "TEXT"),
        ("homework", "TEXT"),
        ("status", "TEXT NOT NULL DEFAULT 'done'"),
        ("rate", "REAL"),
        ("via_agency", "INTEGER NOT NULL DEFAULT 0"),
        ("agency_paid_at", "TEXT"),
        ("series_id", "TEXT"),
    ],
    "payments": [("note", "TEXT")],
}


# ---------------------------------------------------------------------------
# Base de données
# ---------------------------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    with open(os.path.join(BASE_DIR, "schema.sql"), encoding="utf-8") as f:
        conn.executescript(f.read())
    for table, columns in NEW_COLUMNS.items():
        existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
        for name, declaration in columns:
            if name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {declaration}")
    # Les anciennes séances terminées reçoivent le tarif de leur élève
    conn.execute(
        "UPDATE sessions SET rate = (SELECT hourly_rate FROM students "
        "WHERE students.id = sessions.student_id) "
        "WHERE rate IS NULL AND status = 'done'"
    )
    conn.commit()
    conn.close()


def rows(conn, sql, args=()):
    return [dict(r) for r in conn.execute(sql, args).fetchall()]


def one(conn, sql, args=()):
    r = conn.execute(sql, args).fetchone()
    return dict(r) if r else None


def progretudes_payout_month(date_iso):
    """Progrétudes paie le mois suivant les cours faits jusqu'au 25 inclus.
    Un cours après le 25 est payé deux mois plus tard (29 octobre -> décembre)."""
    d = datetime.date.fromisoformat(date_iso)
    m = d.month - 1 + (1 if d.day <= 25 else 2)
    return f"{d.year + m // 12}-{m % 12 + 1:02d}"


def with_payout(session):
    if session and session.get("via_agency"):
        session["expected_payout"] = progretudes_payout_month(session["date"])
    return session


def payout_groups(pending):
    groups = {}
    for s in pending:
        g = groups.setdefault(s["expected_payout"], {"month": s["expected_payout"], "total": 0, "sessions": []})
        g["total"] = round(g["total"] + s["amount"], 2)
        g["sessions"].append(s)
    return [groups[k] for k in sorted(groups)]


def today():
    return datetime.date.today()


def now_hhmm():
    return datetime.datetime.now().strftime("%H:%M")


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


@app.errorhandler(ApiError)
def handle_api_error(e):
    return jsonify({"error": str(e)}), e.status


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Le corps de la requête doit être un objet JSON")
    return data


def text(data, field, required=False):
    value = str(data.get(field) or "").strip()
    if required and not value:
        raise ApiError(f"Le champ '{field}' est obligatoire")
    return value


def number(data, field, allow_zero=False):
    try:
        value = float(data.get(field))
    except (TypeError, ValueError):
        raise ApiError(f"Le champ '{field}' doit être un nombre")
    if value < 0 or (value == 0 and not allow_zero):
        raise ApiError(f"Le champ '{field}' doit être positif")
    return value


def date_field(data, field, default=None):
    value = text(data, field) or default
    try:
        datetime.date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ApiError(f"Le champ '{field}' doit être une date AAAA-MM-JJ")
    return value


def time_field(data, field):
    value = text(data, field)
    if not value:
        return None
    try:
        datetime.datetime.strptime(value, "%H:%M")
    except ValueError:
        raise ApiError(f"Le champ '{field}' doit être une heure HH:MM")
    return value


def text_list(data, field):
    values = data.get(field) or []
    if not isinstance(values, list):
        raise ApiError(f"Le champ '{field}' doit être une liste")
    return [str(v).strip() for v in values if str(v).strip()]


def get_student_or_404(conn, student_id):
    student = one(conn, "SELECT * FROM students WHERE id = ?", (student_id,))
    if student is None:
        raise ApiError("Élève introuvable", 404)
    return student


def get_session_or_404(conn, session_id):
    session = one(conn, SESSION_SELECT + "WHERE sessions.id = ?", (session_id,))
    if session is None:
        raise ApiError("Séance introuvable", 404)
    return session


# Autorise les appels depuis un navigateur (version web de l'app)
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response


# ---------------------------------------------------------------------------
# Connexion par mot de passe
# ---------------------------------------------------------------------------

def app_password():
    if not os.path.exists(PASSWORD_FILE):
        return None
    with open(PASSWORD_FILE, encoding="utf-8") as f:
        return f.read().strip() or None


def secret_key():
    """Clé qui signe les jetons de connexion, créée automatiquement la première fois."""
    if not os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, "w", encoding="utf-8") as f:
            f.write(secrets.token_hex(32))
    with open(SECRET_FILE, encoding="utf-8") as f:
        return f.read().strip()


def serializer():
    return URLSafeTimedSerializer(secret_key(), salt="connexion")


def password_fingerprint(password):
    # Changer le mot de passe déconnecte automatiquement les anciens appareils
    return hashlib.sha256(password.encode("utf-8")).hexdigest()[:16]


@app.before_request
def require_login():
    if request.method == "OPTIONS" or not request.path.startswith("/api/"):
        return None
    if request.path == "/api/login":
        return None
    password = app_password()
    if password is None:
        return None
    header = request.headers.get("Authorization", "")
    token = header[7:] if header.startswith("Bearer ") else ""
    try:
        if serializer().loads(token, max_age=TOKEN_MAX_AGE) == password_fingerprint(password):
            return None
    except BadSignature:
        pass
    return jsonify({"error": "Connexion requise"}), 401


@app.route("/api/login", methods=["POST"])
def api_login():
    password = app_password()
    if password is None:
        return jsonify({"token": "", "password_required": False})
    given = str(body().get("password") or "")
    if not hmac.compare_digest(given.encode("utf-8"), password.encode("utf-8")):
        time.sleep(1)  # ralentit les essais au hasard
        raise ApiError("Mot de passe incorrect", 401)
    return jsonify({"token": serializer().dumps(password_fingerprint(password))})


# ---------------------------------------------------------------------------
# Élèves
# ---------------------------------------------------------------------------

def student_with_totals(row):
    s = dict(row)
    s["via_progretudes"] = bool(s["via_progretudes"])
    # Positif : l'élève me doit de l'argent. Négatif : il a payé d'avance.
    s["balance"] = round(s["direct_earned"] - s["total_paid"], 2)
    return s


def read_student_fields(data):
    return (
        text(data, "name", required=True),
        text(data, "level"),
        number(data, "hourly_rate"),
        text(data, "subject"),
        1 if data.get("via_progretudes") else 0,
    )


@app.route("/api/students", methods=["GET", "POST"])
def api_students():
    conn = get_db()
    try:
        if request.method == "POST":
            fields = read_student_fields(body())
            cur = conn.execute(
                "INSERT INTO students (name, level, hourly_rate, subject, via_progretudes) "
                "VALUES (?, ?, ?, ?, ?)", fields)
            conn.commit()
            row = one(conn, STUDENT_SELECT + "WHERE s.id = ?", (cur.lastrowid,))
            return jsonify(student_with_totals(row)), 201

        return jsonify([student_with_totals(r)
                        for r in rows(conn, STUDENT_SELECT + "ORDER BY s.name")])
    finally:
        conn.close()


@app.route("/api/students/<int:student_id>", methods=["GET", "PUT", "DELETE"])
def api_student(student_id):
    conn = get_db()
    try:
        get_student_or_404(conn, student_id)

        if request.method == "DELETE":
            for table in ("items", "payments", "sessions"):
                conn.execute(f"DELETE FROM {table} WHERE student_id = ?", (student_id,))
            conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
            conn.commit()
            return "", 204

        if request.method == "PUT":
            fields = read_student_fields(body())
            conn.execute(
                "UPDATE students SET name = ?, level = ?, hourly_rate = ?, subject = ?, "
                "via_progretudes = ? WHERE id = ?", fields + (student_id,))
            # Les séances pas encore terminées suivent le nouveau statut Progrétudes
            conn.execute("UPDATE sessions SET via_agency = ? WHERE student_id = ? "
                         "AND status = 'planned'", (fields[4], student_id))
            conn.commit()

        student = student_with_totals(one(conn, STUDENT_SELECT + "WHERE s.id = ?", (student_id,)))
        student["planned"] = rows(conn, SESSION_SELECT +
                                  "WHERE sessions.student_id = ? AND status = 'planned' "
                                  "ORDER BY date, COALESCE(time, '')", (student_id,))
        student["history"] = rows(conn, SESSION_SELECT +
                                  "WHERE sessions.student_id = ? AND status = 'done' "
                                  "ORDER BY date DESC, COALESCE(time, '') DESC", (student_id,))
        student["payments"] = rows(conn, PAYMENT_SELECT + "WHERE payments.student_id = ? "
                                   "ORDER BY date DESC, payments.id DESC", (student_id,))
        student["items"] = rows(conn, "SELECT * FROM items WHERE student_id = ? "
                                "ORDER BY done_at IS NOT NULL, done_at DESC, id", (student_id,))
        return jsonify(student)
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Difficultés et "à faire" (listes à cocher)
# ---------------------------------------------------------------------------

@app.route("/api/students/<int:student_id>/items", methods=["POST"])
def api_add_item(student_id):
    conn = get_db()
    try:
        get_student_or_404(conn, student_id)
        data = body()
        kind = data.get("kind")
        if kind not in ("difficulty", "todo"):
            raise ApiError("Le champ 'kind' doit valoir 'difficulty' ou 'todo'")
        cur = conn.execute(
            "INSERT INTO items (student_id, kind, text, created_at) VALUES (?, ?, ?, ?)",
            (student_id, kind, text(data, "text", required=True), today().isoformat()))
        conn.commit()
        return jsonify(one(conn, "SELECT * FROM items WHERE id = ?", (cur.lastrowid,))), 201
    finally:
        conn.close()


@app.route("/api/items/<int:item_id>", methods=["PATCH", "DELETE"])
def api_item(item_id):
    conn = get_db()
    try:
        if one(conn, "SELECT id FROM items WHERE id = ?", (item_id,)) is None:
            raise ApiError("Élément introuvable", 404)
        if request.method == "DELETE":
            conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
            conn.commit()
            return "", 204
        data = body()
        done_at = today().isoformat() if data.get("done") else None
        conn.execute("UPDATE items SET done_at = ? WHERE id = ?", (done_at, item_id))
        conn.commit()
        return jsonify(one(conn, "SELECT * FROM items WHERE id = ?", (item_id,)))
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Séances (planifiées puis terminées)
# ---------------------------------------------------------------------------

def session_context(conn, session):
    """Ce dont j'ai besoin pour préparer une séance : la précédente et les listes en cours."""
    key = session["date"] + (session["time"] or "")
    previous = one(conn, SESSION_SELECT +
                   "WHERE sessions.student_id = ? AND status = 'done' AND sessions.id != ? "
                   "AND sessions.date || COALESCE(sessions.time, '') <= ? "
                   "ORDER BY sessions.date DESC, COALESCE(sessions.time, '') DESC, sessions.id DESC "
                   "LIMIT 1", (session["student_id"], session["id"], key))
    items = rows(conn, "SELECT * FROM items WHERE student_id = ? AND done_at IS NULL ORDER BY id",
                 (session["student_id"],))
    return {
        **with_payout(dict(session)),
        "previous": previous,
        "difficulties": [i for i in items if i["kind"] == "difficulty"],
        "todos": [i for i in items if i["kind"] == "todo"],
    }


@app.route("/api/sessions", methods=["GET", "POST"])
def api_sessions():
    conn = get_db()
    try:
        if request.method == "POST":
            # Planifier un cours (éventuellement récurrent)
            data = body()
            student_id = int(data.get("student_id") or 0)
            student = get_student_or_404(conn, student_id)
            first = date_field(data, "date")
            start_time = time_field(data, "time")
            duration = number(data, "duration_hours")
            subject = text(data, "subject") or student["subject"] or ""
            try:
                repeat = int(data.get("repeat") or 1)
                every = int(data.get("every_weeks") or 1)
            except (TypeError, ValueError):
                raise ApiError("Récurrence invalide")
            if not 1 <= repeat <= 52 or every not in (1, 2):
                raise ApiError("Un cours récurrent : de 1 à 52 cours, chaque semaine ou toutes les 2 semaines")
            series_id = uuid.uuid4().hex if repeat > 1 else None
            ids = []
            for i in range(repeat):
                day = datetime.date.fromisoformat(first) + datetime.timedelta(weeks=i * every)
                cur = conn.execute(
                    "INSERT INTO sessions (student_id, date, time, duration_hours, subject, "
                    "status, via_agency, series_id) VALUES (?, ?, ?, ?, ?, 'planned', ?, ?)",
                    (student_id, day.isoformat(), start_time, duration, subject,
                     student["via_progretudes"], series_id))
                ids.append(cur.lastrowid)
            conn.commit()
            created = get_session_or_404(conn, ids[0])
            created["created_count"] = len(ids)
            return jsonify(created), 201

        status = request.args.get("status")
        if status == "planned":
            sql = "WHERE status = 'planned' ORDER BY date, COALESCE(time, '')"
        elif status == "done":
            sql = "WHERE status = 'done' ORDER BY date DESC, COALESCE(time, '') DESC"
        else:
            sql = "ORDER BY date DESC, COALESCE(time, '') DESC"
        return jsonify(rows(conn, SESSION_SELECT + sql))
    finally:
        conn.close()


@app.route("/api/sessions/<int:session_id>", methods=["GET", "PUT", "DELETE"])
def api_session(session_id):
    conn = get_db()
    try:
        session = get_session_or_404(conn, session_id)

        if request.method == "DELETE":
            if request.args.get("scope") == "following" and session["series_id"]:
                # Annule ce cours et les suivants de la série (seulement ceux pas encore faits)
                conn.execute("DELETE FROM sessions WHERE series_id = ? AND status = 'planned' "
                             "AND date >= ?", (session["series_id"], session["date"]))
            else:
                conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()
            return "", 204

        if request.method == "PUT":
            data = body()
            conn.execute(
                "UPDATE sessions SET date = ?, time = ?, duration_hours = ?, subject = ?, "
                "notes = ?, homework = ? WHERE id = ?",
                (date_field(data, "date", session["date"]),
                 time_field(data, "time") if "time" in data else session["time"],
                 number(data, "duration_hours") if "duration_hours" in data else session["duration_hours"],
                 text(data, "subject") if "subject" in data else session["subject"],
                 text(data, "notes") if "notes" in data else session["notes"],
                 text(data, "homework") if "homework" in data else session["homework"],
                 session_id))
            conn.commit()
            session = get_session_or_404(conn, session_id)

        return jsonify(session_context(conn, session))
    finally:
        conn.close()


@app.route("/api/sessions/<int:session_id>/complete", methods=["POST"])
def api_complete_session(session_id):
    """Terminer une séance : compte-rendu, devoirs, nouvelles listes, paiement éventuel."""
    conn = get_db()
    try:
        session = get_session_or_404(conn, session_id)
        student = get_student_or_404(conn, session["student_id"])
        data = body()
        conn.execute(
            "UPDATE sessions SET status = 'done', duration_hours = ?, notes = ?, homework = ?, "
            "rate = ?, via_agency = ? WHERE id = ?",
            (number(data, "duration_hours") if "duration_hours" in data else session["duration_hours"],
             text(data, "notes"), text(data, "homework"),
             student["hourly_rate"], student["via_progretudes"], session_id))
        for kind, field in (("difficulty", "difficulties"), ("todo", "todos")):
            for item in text_list(data, field):
                conn.execute(
                    "INSERT INTO items (student_id, kind, text, created_at) VALUES (?, ?, ?, ?)",
                    (student["id"], kind, item, session["date"]))
        if data.get("payment_amount") not in (None, "", 0) and not student["via_progretudes"]:
            conn.execute(
                "INSERT INTO payments (student_id, date, amount) VALUES (?, ?, ?)",
                (student["id"], date_field(data, "payment_date", today().isoformat()),
                 number(data, "payment_amount")))
        conn.commit()
        return jsonify(session_context(conn, get_session_or_404(conn, session_id)))
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Paiements directs
# ---------------------------------------------------------------------------

@app.route("/api/payments", methods=["GET", "POST"])
def api_payments():
    conn = get_db()
    try:
        if request.method == "POST":
            data = body()
            student_id = int(data.get("student_id") or 0)
            get_student_or_404(conn, student_id)
            cur = conn.execute(
                "INSERT INTO payments (student_id, date, amount, note) VALUES (?, ?, ?, ?)",
                (student_id, date_field(data, "date", today().isoformat()),
                 number(data, "amount"), text(data, "note")))
            conn.commit()
            return jsonify(one(conn, PAYMENT_SELECT + "WHERE payments.id = ?", (cur.lastrowid,))), 201
        return jsonify(rows(conn, PAYMENT_SELECT + "ORDER BY date DESC, payments.id DESC"))
    finally:
        conn.close()


@app.route("/api/payments/<int:payment_id>", methods=["DELETE"])
def api_delete_payment(payment_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM payments WHERE id = ?", (payment_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise ApiError("Paiement introuvable", 404)
        return "", 204
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Progrétudes
# ---------------------------------------------------------------------------

@app.route("/api/progretudes")
def api_progretudes():
    conn = get_db()
    try:
        pending = rows(conn, SESSION_SELECT +
                       "WHERE status = 'done' AND via_agency = 1 AND agency_paid_at IS NULL "
                       "ORDER BY date, COALESCE(time, '')")
        paid = rows(conn, SESSION_SELECT +
                    "WHERE status = 'done' AND via_agency = 1 AND agency_paid_at IS NOT NULL "
                    "ORDER BY agency_paid_at DESC, date DESC LIMIT 20")
        pending = [with_payout(s) for s in pending]
        return jsonify({
            "pending": pending,
            "pending_total": round(sum(s["amount"] for s in pending), 2),
            "payouts": payout_groups(pending),
            "paid": paid,
        })
    finally:
        conn.close()


@app.route("/api/progretudes/paid", methods=["POST"])
def api_progretudes_paid():
    """Progrétudes m'a versé l'argent de ces séances (ou annuler avec "paid": false)."""
    conn = get_db()
    try:
        data = body()
        ids = [int(i) for i in data.get("session_ids") or []]
        if not ids:
            raise ApiError("Choisis au moins une séance")
        paid_at = date_field(data, "date", today().isoformat()) if data.get("paid", True) else None
        marks = ",".join("?" * len(ids))
        conn.execute(f"UPDATE sessions SET agency_paid_at = ? WHERE via_agency = 1 "
                     f"AND status = 'done' AND id IN ({marks})", [paid_at] + ids)
        conn.commit()
        return "", 204
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Tableau de bord
# ---------------------------------------------------------------------------

def period_stats(conn, start, end):
    s = one(conn, f"""
        SELECT COUNT(*) AS session_count,
          COALESCE(SUM(duration_hours), 0) AS hours,
          COALESCE(SUM(amt), 0) AS earned,
          COALESCE(SUM(CASE WHEN via_agency = 0 THEN amt END), 0) AS direct,
          COALESCE(SUM(CASE WHEN via_agency = 1 THEN amt END), 0) AS agency,
          COALESCE(SUM(CASE WHEN via_agency = 1 AND agency_paid_at IS NULL THEN amt END), 0)
            AS agency_pending
        FROM (SELECT sessions.*, {AMOUNT} AS amt FROM sessions
              JOIN students ON students.id = sessions.student_id)
        WHERE status = 'done' AND date BETWEEN ? AND ?""", (start, end))
    direct_received = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE date BETWEEN ? AND ?",
        (start, end)).fetchone()[0]
    agency_received = conn.execute(
        f"SELECT COALESCE(SUM({AMOUNT}), 0) FROM sessions JOIN students "
        "ON students.id = sessions.student_id "
        "WHERE via_agency = 1 AND agency_paid_at BETWEEN ? AND ?", (start, end)).fetchone()[0]
    s["received"] = direct_received + agency_received
    s["start"], s["end"] = start, end
    return s


@app.route("/api/dashboard")
def api_dashboard():
    conn = get_db()
    try:
        t = today()
        week_start = t - datetime.timedelta(days=t.weekday())
        month_end = t.replace(day=calendar.monthrange(t.year, t.month)[1])
        now_key = t.isoformat() + now_hhmm()

        planned = rows(conn, SESSION_SELECT + "WHERE status = 'planned' "
                       "ORDER BY date, COALESCE(time, '')")
        key = lambda s: s["date"] + (s["time"] or "99:99")
        upcoming = [s for s in planned if key(s) >= now_key]
        to_complete = [s for s in planned if key(s) < now_key]

        students = [student_with_totals(r) for r in rows(conn, STUDENT_SELECT)]
        pending = [with_payout(s) for s in rows(conn, SESSION_SELECT +
                   "WHERE status = 'done' AND via_agency = 1 AND agency_paid_at IS NULL")]
        payouts = payout_groups(pending)
        return jsonify({
            "next_payout": payouts[0] if payouts else None,
            "today": t.isoformat(),
            "next": session_context(conn, upcoming[0]) if upcoming else None,
            "upcoming": upcoming[1:6],
            "to_complete": to_complete,
            "week": period_stats(conn, week_start.isoformat(),
                                 (week_start + datetime.timedelta(days=6)).isoformat()),
            "month": period_stats(conn, t.replace(day=1).isoformat(), month_end.isoformat()),
            "owed_total": round(sum(s["balance"] for s in students if s["balance"] > 0), 2),
            "agency_pending_total": round(sum(s["agency_pending"] for s in students), 2),
        })
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Version web de l'app (sert le dossier web/)
# ---------------------------------------------------------------------------

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def web_app(path):
    if path.startswith("api/"):
        raise ApiError("Adresse inconnue", 404)
    if path and os.path.isfile(os.path.join(WEB_DIR, path)):
        return send_from_directory(WEB_DIR, path)
    if os.path.isfile(os.path.join(WEB_DIR, "index.html")):
        response = send_from_directory(WEB_DIR, "index.html")
        response.headers["Cache-Control"] = "no-cache"
        return response
    return jsonify({"message": "API cours particuliers : tout fonctionne"})


init_db()

if __name__ == "__main__":
    # host="0.0.0.0" : rend le serveur accessible depuis ton téléphone (même Wi-Fi)
    app.run(host="0.0.0.0", port=5000, debug=True)
