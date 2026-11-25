CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT,
    hourly_rate REAL,
    subject TEXT,                                -- matière principale
    via_progretudes INTEGER NOT NULL DEFAULT 0   -- 1 si l'élève passe par l'agence
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    date TEXT NOT NULL,                          -- AAAA-MM-JJ
    time TEXT,                                   -- HH:MM
    duration_hours REAL NOT NULL,
    subject TEXT,
    notes TEXT,                                  -- ce qu'on a fait
    homework TEXT,                               -- devoirs pour la prochaine fois
    status TEXT NOT NULL DEFAULT 'done',         -- 'planned' ou 'done'
    rate REAL,                                   -- tarif figé quand la séance est terminée
    via_agency INTEGER NOT NULL DEFAULT 0,       -- 1 si payée par Progrétudes
    agency_paid_at TEXT,                         -- date du versement Progrétudes
    series_id TEXT                               -- même valeur pour les cours d'une série récurrente
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT
);

-- Listes de suivi : difficultés et choses à faire à la prochaine séance
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    kind TEXT NOT NULL CHECK (kind IN ('difficulty', 'todo')),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    done_at TEXT                                 -- rempli quand c'est acquis / fait
);
