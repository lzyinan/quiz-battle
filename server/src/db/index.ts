import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { MIGRATIONS } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations();
  }
  return db;
}

function runMigrations(): void {
  for (const sql of MIGRATIONS) {
    db.exec(sql);
  }
}
