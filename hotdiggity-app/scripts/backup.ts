// Makes a consistent copy of the database plus the uploaded records.
//   npm run backup                 -> DATA_DIR/backups/2026-09-23-1405/
// Safe to run while the site is live. Copy the backups folder somewhere off the server
// (Google Drive, Dropbox) on a schedule. That copy is your insurance policy.
import fs from 'node:fs'
import path from 'node:path'
import { db, DATA_DIR, UPLOAD_DIR } from '../lib/db.ts'

const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')
const dest = path.join(DATA_DIR, 'backups', stamp)
fs.mkdirSync(dest, { recursive: true })
db.exec(`VACUUM INTO '${path.join(dest, 'hotdiggity.db').replace(/'/g, "''")}'`)
fs.cpSync(UPLOAD_DIR, path.join(dest, 'uploads'), { recursive: true })
console.log('Backup written to', dest)
