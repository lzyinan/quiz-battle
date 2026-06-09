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
  `
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname   TEXT NOT NULL UNIQUE,
    token      TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_token ON users(token);
  `,
  `
  CREATE TABLE IF NOT EXISTS game_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id          TEXT NOT NULL,
    player1_id       INTEGER NOT NULL REFERENCES users(id),
    player2_id       INTEGER NOT NULL REFERENCES users(id),
    player1_name     TEXT NOT NULL,
    player2_name     TEXT NOT NULL,
    player1_score    INTEGER NOT NULL DEFAULT 0,
    player2_score    INTEGER NOT NULL DEFAULT 0,
    winner           INTEGER,
    question_count   INTEGER NOT NULL,
    quiz_id          INTEGER,
    answers          TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at       TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_game_records_player1 ON game_records(player1_id);
  CREATE INDEX IF NOT EXISTS idx_game_records_player2 ON game_records(player2_id);
  `,
];
