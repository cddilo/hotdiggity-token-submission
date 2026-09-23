// Creates (or promotes) the owner account.
//   npm run create-admin -- you@example.com "Your Name" "a-strong-password"
import bcrypt from 'bcryptjs'
import { one, run } from '../lib/db.ts'

const [email, name = '', password] = process.argv.slice(2)
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- email "Name" password   (password: 8+ characters)')
  process.exit(1)
}
const hash = bcrypt.hashSync(password, 10)
const [first, ...rest] = name.split(' ')
const existing = one<{ id: number }>('SELECT id FROM users WHERE email = ?', email.toLowerCase())
if (existing) {
  run("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?", hash, existing.id)
  console.log(`${email} is now an admin (password updated).`)
} else {
  run("INSERT INTO users (email, first_name, last_name, role, password_hash) VALUES (?, ?, ?, 'admin', ?)",
    email.toLowerCase(), first, rest.join(' '), hash)
  console.log(`Admin account created for ${email}.`)
}
