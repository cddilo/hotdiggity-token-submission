import 'server-only'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { one, run, type User } from './db'

const COOKIE = 'hddr_session'
const SESSION_DAYS = 30

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10)
}

export async function verifyPassword(pw: string, hash: string | null): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(pw, hash)
}

export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', sha256(token), userId, expires.toISOString())
  run("DELETE FROM sessions WHERE expires_at < ?", new Date().toISOString())
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  })
}

export async function endSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', sha256(token))
  jar.delete(COOKIE)
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const user = one<User>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    sha256(token), new Date().toISOString(),
  )
  return user ?? null
}

export async function requireUser(): Promise<User> {
  const user = await currentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireStaff(): Promise<User> {
  const user = await currentUser()
  if (!user) redirect('/login?next=/admin')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/account')
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireStaff()
  if (user.role !== 'admin') redirect('/admin?error=' + encodeURIComponent('Only the owner account can change that.'))
  return user
}

// A small brake on password guessing. Resets when the server restarts, which is fine
// for a single-location business.
const attempts = new Map<string, { n: number; until: number }>()
export function tooManyAttempts(key: string): boolean {
  const a = attempts.get(key)
  return !!a && a.n >= 8 && a.until > Date.now()
}
export function noteFailedAttempt(key: string) {
  const a = attempts.get(key)
  const fresh = !a || a.until < Date.now()
  attempts.set(key, { n: fresh ? 1 : a!.n + 1, until: Date.now() + 15 * 60_000 })
}
export function clearAttempts(key: string) {
  attempts.delete(key)
}
