// Mise en forme des montants, durées et dates en français

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function euro(n) {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
}

export function hours(n) {
  const v = Number(n || 0);
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  if (h === 0 && m) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export const time = (t) => (t ? t.replace(":", "h") : "");

export function toDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayISO = () => isoDate(new Date());

export function addDays(iso, n) {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function dayLong(iso) {
  const d = toDate(iso);
  return `${cap(DAYS[d.getDay()])} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dayShort(iso) {
  const d = toDate(iso);
  return `${DAYS[d.getDay()].slice(0, 3)}. ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export const weekdayShort = (iso) => DAYS[toDate(iso).getDay()].slice(0, 3);
export const dayNumber = (iso) => toDate(iso).getDate();
export const monthShort = (iso) => MONTHS_SHORT[toDate(iso).getMonth()];

export function relativeDay(iso) {
  const diff = Math.round((toDate(iso) - toDate(todayISO())) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  if (diff > 1 && diff < 7) return `Dans ${diff} jours`;
  return cap(dayShort(iso));
}

export function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

// Accepte "1,5" comme "1.5"
export const toNumber = (s) => Number(String(s).replace(",", ".").trim());

// "2026-12" -> "décembre" (avec l'année si ce n'est pas l'année en cours)
export function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return y === new Date().getFullYear() ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
}

// Progrétudes : versement du mois M = cours faits du 26 de M-2 au 25 de M-1
export function payoutCutoff(ym) {
  const [y, m] = ym.split("-").map(Number);
  const prev = m === 1 ? 12 : m - 1;
  return `25 ${MONTHS[prev - 1]}`;
}
