// Fills a fresh database with pretend clients and bookings so you can click around.
// Never run this against the real business database.
import bcrypt from 'bcryptjs'
import { one, run } from '../lib/db.ts'

if (one('SELECT id FROM users WHERE email = ?', 'demo.client@example.com')) {
  console.log('Demo data already loaded.'); process.exit(0)
}
const iso = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
const hash = bcrypt.hashSync('demo-password', 10)
const u1 = run("INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES ('demo.client@example.com', ?, 'Maria', 'Lopez', '760-555-0101')", hash).id
const u2 = run("INSERT INTO users (email, first_name, last_name, phone) VALUES ('demo.two@example.com', 'Tom', 'Nguyen', '760-555-0102')").id
const p1 = run("INSERT INTO pets (owner_id, name, breed, sex, feeding, temperament_ok) VALUES (?, 'Biscuit', 'Golden Retriever', 'Male', '2 cups AM/PM', 1)", u1).id
const p2 = run("INSERT INTO pets (owner_id, name, breed, sex) VALUES (?, 'Luna', 'French Bulldog', 'Female')", u2).id
for (const p of [p1, p2]) for (const k of ['Rabies', 'DHPP', 'Bordetella']) run('INSERT INTO vaccinations (pet_id, kind, expires_on, verified) VALUES (?, ?, ?, 1)', p, k, iso(200))
const svc = (slug: string) => one<{ id: number }>('SELECT id FROM services WHERE slug = ?', slug)!.id
const b1 = run("INSERT INTO bookings (user_id, service_id, start_date, end_date, status, total_cents, deposit_cents) VALUES (?, ?, ?, ?, 'confirmed', 19500, 2500)", u1, svc('boarding-suite'), iso(0), iso(3)).id
run('INSERT INTO booking_pets VALUES (?, ?)', b1, p1)
const b2 = run("INSERT INTO bookings (user_id, service_id, start_date, end_date, status, total_cents) VALUES (?, ?, ?, ?, 'requested', 9500)", u2, svc('groom-full'), iso(2), iso(2)).id
run('INSERT INTO booking_pets VALUES (?, ?)', b2, p2)
console.log('Demo data loaded. Client login: demo.client@example.com / demo-password')
