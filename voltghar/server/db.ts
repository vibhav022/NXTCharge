import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
const path = process.env.DATABASE_PATH || "./data/voltghar-live.db";
if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
export const db = new DatabaseSync(path);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('driver','host','admin')),created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vehicles(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,connector TEXT NOT NULL,max_kw REAL NOT NULL CHECK(max_kw>0));
CREATE TABLE IF NOT EXISTS chargers(id TEXT PRIMARY KEY,host_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,area TEXT NOT NULL,address TEXT NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,connector TEXT NOT NULL,kw REAL NOT NULL CHECK(kw>0),price INTEGER NOT NULL CHECK(price>0),solar INTEGER NOT NULL DEFAULT 0,open_hour INTEGER NOT NULL,close_hour INTEGER NOT NULL,instructions TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),charger_id TEXT NOT NULL REFERENCES chargers(id),vehicle_id TEXT NOT NULL REFERENCES vehicles(id),start_at TEXT NOT NULL,end_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','charging','completed','cancelled')),rate INTEGER NOT NULL,access_hash TEXT NOT NULL,access_code TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS bookings_overlap ON bookings(charger_id,start_at,end_at,status);
CREATE TRIGGER IF NOT EXISTS booking_no_overlap BEFORE INSERT ON bookings WHEN NEW.status IN ('confirmed','charging') BEGIN SELECT RAISE(ABORT,'slot_conflict') WHERE EXISTS(SELECT 1 FROM bookings WHERE charger_id=NEW.charger_id AND status IN ('confirmed','charging') AND start_at<NEW.end_at AND end_at>NEW.start_at); END;
CREATE TABLE IF NOT EXISTS charging_sessions(id TEXT PRIMARY KEY,booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),started_at TEXT NOT NULL,ended_at TEXT,energy_kwh REAL NOT NULL DEFAULT 0,source TEXT NOT NULL CHECK(source IN ('simulated','metered')),cost_paise INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS meter_log(booking_id TEXT PRIMARY KEY REFERENCES bookings(id),opening REAL NOT NULL,closing REAL);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),message TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor_id TEXT REFERENCES users(id),action TEXT NOT NULL,target_id TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
export const one = (sql: string, ...args: any[]) =>
  db.prepare(sql).get(...args) as any;
export const all = (sql: string, ...args: any[]) =>
  db.prepare(sql).all(...args) as any[];
export const run = (sql: string, ...args: any[]) =>
  db.prepare(sql).run(...args);
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
