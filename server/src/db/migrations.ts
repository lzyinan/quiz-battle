export const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS quizzes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK(type IN ('single', 'judge')),
    content     TEXT NOT NULL,
    options     TEXT NOT NULL,
    answer      INTEGER NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `,
];
