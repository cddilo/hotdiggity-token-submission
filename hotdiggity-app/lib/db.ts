// The whole business lives in one SQLite file (DATA_DIR/hotdiggity.db).
// Node's built-in SQLite means there's no database server to run or pay for.
// Back up that file and the uploads folder and you've backed up everything.
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || './data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  emergency_contact TEXT NOT NULL DEFAULT '',
  sms_opt_in INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','staff','admin')),
  staff_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT '',
  birthdate TEXT NOT NULL DEFAULT '',
  weight_lbs REAL,
  color TEXT NOT NULL DEFAULT '',
  fixed INTEGER NOT NULL DEFAULT 0,
  feeding TEXT NOT NULL DEFAULT '',
  medications TEXT NOT NULL DEFAULT '',
  allergies TEXT NOT NULL DEFAULT '',
  behavior TEXT NOT NULL DEFAULT '',
  vet_name TEXT NOT NULL DEFAULT '',
  vet_phone TEXT NOT NULL DEFAULT '',
  staff_notes TEXT NOT NULL DEFAULT '',
  temperament_ok INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vaccinations (
  id INTEGER PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  expires_on TEXT NOT NULL,
  file_name TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('boarding','daycare','grooming','training','wellness')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'visit' CHECK (unit IN ('night','day','visit','package')),
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  bookable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  dropoff_time TEXT NOT NULL DEFAULT '',
  pickup_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','confirmed','checked_in','checked_out','cancelled','declined')),
  customer_notes TEXT NOT NULL DEFAULT '',
  staff_notes TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS bookings_dates ON bookings(start_date, end_date);

CREATE TABLE IF NOT EXISTS booking_pets (
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, pet_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  recorded_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS report_cards (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  ate TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  handled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

// Starting price list. These are placeholders: the admin dashboard shows a
// warning until the owner reviews them under Admin > Services & Prices.
const DEFAULT_SERVICES: Array<[string, string, string, string, number, string, number, number]> = [
  // slug, category, name, description, price, unit, deposit, bookable
  ['boarding-suite', 'boarding', 'Overnight Boarding: Private Suite',
    'Your dog gets their own climate-controlled suite, group or solo play, and 24/7 webcam access for you.', 6500, 'night', 2500, 1],
  ['boarding-shared', 'boarding', 'Overnight Boarding: Family Suite (2nd dog)',
    'A second dog from the same family sharing a suite.', 4500, 'night', 0, 0],
  ['daycare-full', 'daycare', 'Daycare: Full Day',
    'Supervised play, rest time, and enrichment from drop-off until pickup.', 4000, 'day', 0, 1],
  ['daycare-half', 'daycare', 'Daycare: Half Day',
    'Up to five hours of play and enrichment.', 3000, 'day', 0, 1],
  ['groom-bath', 'grooming', 'Bath & Tidy',
    'Bath, blow-dry, brush-out, nail trim, ear cleaning, and a light tidy.', 6000, 'visit', 0, 1],
  ['groom-full', 'grooming', 'Full Groom',
    'Everything in Bath & Tidy plus a full breed or custom haircut by our Master Groomer.', 9500, 'visit', 0, 1],
  ['groom-nails', 'grooming', 'Nail Trim',
    'Quick nail trim, walk-ins welcome during business hours.', 2000, 'visit', 0, 1],
  ['leep', 'training', 'L.E.E.P. Enrichment Program',
    'Our structured learning and enrichment program. Add it to any boarding or daycare stay.', 2500, 'day', 0, 1],
  ['training-private', 'training', 'Private Training Session',
    'One-on-one session with our Professional Dog Trainer and Certified Animal Behaviorist.', 12000, 'visit', 0, 1],
  ['teeth-cleaning', 'wellness', 'Anesthesia-Free Teeth Cleaning',
    'Gentle scaling and polishing without putting your dog under.', 17500, 'visit', 5000, 1],
  ['vaccinations', 'wellness', 'On-Site Vaccinations',
    'Keep shots current without a separate vet trip. Call for current clinic dates.', 0, 'visit', 0, 0],
]

const DEFAULT_SETTINGS: Record<string, string> = {
  boarding_capacity: '40',
  daycare_capacity: '40',
  grooming_per_day: '12',
  required_vaccines: 'Rabies,DHPP,Bordetella',
  prices_reviewed: '0',
}

function open(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const db = new DatabaseSync(path.join(DATA_DIR, 'hotdiggity.db'))
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  db.exec(SCHEMA)

  const count = db.prepare('SELECT COUNT(*) AS n FROM services').get() as { n: number }
  if (count.n === 0) {
    const insert = db.prepare(`INSERT INTO services
      (slug, category, name, description, price_cents, unit, deposit_cents, bookable, sort)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    DEFAULT_SERVICES.forEach((s, i) => insert.run(...s, i))
  }
  const setDefault = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) setDefault.run(k, v)
  return db
}

// Next.js dev mode reloads modules; keep one connection per process.
const g = globalThis as unknown as { __hddrDb?: DatabaseSync }
export const db: DatabaseSync = g.__hddrDb ?? (g.__hddrDb = open())

type Param = string | number | bigint | null | Uint8Array
export function all<T>(sql: string, ...params: Param[]): T[] {
  return db.prepare(sql).all(...params) as T[]
}
export function one<T>(sql: string, ...params: Param[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined
}
export function run(sql: string, ...params: Param[]) {
  const r = db.prepare(sql).run(...params)
  return { id: Number(r.lastInsertRowid), changes: Number(r.changes) }
}
export function tx<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function getSetting(key: string): string {
  return one<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? DEFAULT_SETTINGS[key] ?? ''
}
export function setSetting(key: string, value: string) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value)
}

// ---- Row types ----
export type Role = 'customer' | 'staff' | 'admin'
export type User = {
  id: number; email: string; password_hash: string | null; first_name: string; last_name: string
  phone: string; address: string; emergency_contact: string; sms_opt_in: number; role: Role
  staff_notes: string; created_at: string
}
export type Pet = {
  id: number; owner_id: number; name: string; breed: string; sex: string; birthdate: string
  weight_lbs: number | null; color: string; fixed: number; feeding: string; medications: string
  allergies: string; behavior: string; vet_name: string; vet_phone: string; staff_notes: string
  temperament_ok: number; active: number; created_at: string
}
export type Vaccination = {
  id: number; pet_id: number; kind: string; expires_on: string; file_name: string | null
  verified: number; created_at: string
}
export type Service = {
  id: number; slug: string; category: 'boarding' | 'daycare' | 'grooming' | 'training' | 'wellness'
  name: string; description: string; price_cents: number; unit: 'night' | 'day' | 'visit' | 'package'
  deposit_cents: number; bookable: number; active: number; sort: number
}
export type BookingStatus = 'requested' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'declined'
export type Booking = {
  id: number; user_id: number; service_id: number; start_date: string; end_date: string
  dropoff_time: string; pickup_time: string; status: BookingStatus; customer_notes: string
  staff_notes: string; total_cents: number; deposit_cents: number; paid_cents: number
  stripe_session_id: string | null; created_at: string; updated_at: string
}
