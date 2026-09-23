// Brings clients and their dogs over from an EasyBusy (or any) CSV export.
//   npm run import-clients -- path/to/export.csv            (dry run: shows what it would do)
//   npm run import-clients -- path/to/export.csv --commit   (actually imports)
//
// One row per dog is expected. Rows with the same owner email are grouped under one client.
// Column names are matched loosely, so "Owner Email", "Client Email", and "email" all work.
// Imported clients get no password; they set one with "Forgot password" on the login page.
import fs from 'node:fs'
import { one, run, tx } from '../lib/db.ts'

const [file, flag] = process.argv.slice(2)
if (!file) { console.error('Usage: npm run import-clients -- export.csv [--commit]'); process.exit(1) }
const commit = flag === '--commit'

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim()))
}

const ALIASES: Record<string, string[]> = {
  email: ['email', 'owner email', 'client email', 'customer email', 'e-mail'],
  first_name: ['first name', 'owner first name', 'client first name', 'firstname'],
  last_name: ['last name', 'owner last name', 'client last name', 'lastname', 'surname'],
  full_name: ['name', 'owner', 'owner name', 'client', 'client name', 'customer', 'customer name'],
  phone: ['phone', 'mobile', 'cell', 'phone number', 'mobile phone', 'cell phone', 'owner phone'],
  address: ['address', 'street', 'street address'],
  emergency: ['emergency contact', 'emergency'],
  pet_name: ['pet name', 'pet', 'dog name', 'dog', 'animal name'],
  breed: ['breed', 'pet breed'],
  sex: ['sex', 'gender', 'pet sex'],
  birthdate: ['birthdate', 'birthday', 'date of birth', 'dob'],
  weight: ['weight', 'weight (lbs)', 'weight lbs'],
  color: ['color', 'colour', 'markings'],
  vet: ['vet', 'veterinarian', 'vet name'],
  vet_phone: ['vet phone', 'veterinarian phone'],
  notes: ['notes', 'pet notes', 'comments'],
  rabies: ['rabies', 'rabies expiration', 'rabies exp', 'rabies expires'],
  dhpp: ['dhpp', 'dhpp expiration', 'distemper', 'da2pp', 'dapp'],
  bordetella: ['bordetella', 'bordetella expiration', 'kennel cough'],
}

function toISO(s: string): string {
  const t = s.trim()
  if (!t) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` }
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const [header, ...data] = parseCSV(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))
const norm = header.map((h) => h.trim().toLowerCase())
const col: Record<string, number> = {}
for (const [key, names] of Object.entries(ALIASES)) {
  const i = norm.findIndex((h) => names.includes(h))
  if (i >= 0) col[key] = i
}
console.log('Matched columns:', Object.fromEntries(Object.entries(col).map(([k, i]) => [k, header[i]])))
const unmatched = header.filter((_, i) => !Object.values(col).includes(i))
if (unmatched.length) console.log('Ignored columns:', unmatched.join(', '))
if (col.email === undefined) { console.error('No email column found. Rename the owner email column to "Email" and try again.'); process.exit(1) }

const get = (r: string[], k: string) => (col[k] !== undefined ? (r[col[k]] ?? '').trim() : '')
let clients = 0, pets = 0, vax = 0, skipped = 0
const seen = new Map<string, Set<string>>() // dry-run bookkeeping: email -> dog names

const work = () => {
  for (const r of data) {
    const email = get(r, 'email').toLowerCase()
    if (!email.includes('@')) { skipped++; continue }
    let first = get(r, 'first_name'), last = get(r, 'last_name')
    if (!first && get(r, 'full_name')) { const parts = get(r, 'full_name').split(/\s+/); first = parts[0]; last = parts.slice(1).join(' ') }
    let user = one<{ id: number }>('SELECT id FROM users WHERE email = ?', email)
    if (!user && !commit) {
      if (!seen.has(email)) { seen.set(email, new Set()); clients++ }
      const dog = get(r, 'pet_name').toLowerCase()
      if (dog && !seen.get(email)!.has(dog)) { seen.get(email)!.add(dog); pets++ }
      continue
    }
    if (!user) {
      clients++
      if (commit) user = { id: run('INSERT INTO users (email, first_name, last_name, phone, address, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)',
        email, first, last, get(r, 'phone'), get(r, 'address'), get(r, 'emergency')).id }
    }
    const petName = get(r, 'pet_name')
    if (!petName || !user) continue
    const existingPet = one<{ id: number }>('SELECT id FROM pets WHERE owner_id = ? AND name = ? COLLATE NOCASE', user.id, petName)
    let petId = existingPet?.id
    if (!petId) {
      pets++
      const w = Number(get(r, 'weight').replace(/[^\d.]/g, ''))
      if (commit) petId = run(`INSERT INTO pets (owner_id, name, breed, sex, birthdate, weight_lbs, color, vet_name, vet_phone, behavior)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, user.id, petName, get(r, 'breed'), get(r, 'sex'), toISO(get(r, 'birthdate')),
        w > 0 ? w : null, get(r, 'color'), get(r, 'vet'), get(r, 'vet_phone'), get(r, 'notes')).id
    }
    for (const [key, kind] of [['rabies', 'Rabies'], ['dhpp', 'DHPP'], ['bordetella', 'Bordetella']] as const) {
      const exp = toISO(get(r, key))
      if (!exp || !petId) continue
      if (one('SELECT id FROM vaccinations WHERE pet_id = ? AND kind = ? AND expires_on = ?', petId, kind, exp)) continue
      vax++
      // Records from the old system were already checked by staff there.
      if (commit) run('INSERT INTO vaccinations (pet_id, kind, expires_on, verified) VALUES (?, ?, ?, 1)', petId, kind, exp)
    }
  }
}
if (commit) tx(work); else work()

console.log(`${commit ? 'Imported' : 'Would import'}: ${clients} new clients, ${pets} new dogs, ${vax} vaccine dates. Skipped ${skipped} rows without an email.`)
if (!commit) console.log('Dry run only. Add --commit to import for real.')
