'use server'
import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
import { one, run, type User } from './db'
import {
  clearAttempts, endSession, hashPassword, noteFailedAttempt, sha256, startSession, tooManyAttempts, verifyPassword,
} from './auth'
import { back } from './flash'
import { str } from './format'
import { sendEmail, siteUrl } from './notify'
import { BUSINESS } from './business'

function safeNext(v: FormDataEntryValue | null): string {
  const s = String(v ?? '')
  return s.startsWith('/') && !s.startsWith('//') ? s : ''
}

export async function login(formData: FormData) {
  const email = str(formData.get('email'), 200).toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))
  const retry = '/login' + (next ? `?next=${encodeURIComponent(next)}` : '')
  if (tooManyAttempts(email)) back(retry, 'error', 'Too many tries. Please wait 15 minutes or reset your password.')
  const user = one<User>('SELECT * FROM users WHERE email = ?', email)
  if (user && !user.password_hash) {
    back('/forgot-password', 'error', "Your account came over from our old system. Enter your email below and we'll send a link to set a password.")
  }
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    noteFailedAttempt(email)
    back(retry, 'error', "That email and password don't match.")
  }
  clearAttempts(email)
  await startSession(user.id)
  redirect(next || (user.role === 'customer' ? '/account' : '/admin'))
}

export async function signup(formData: FormData) {
  const email = str(formData.get('email'), 200).toLowerCase()
  const password = String(formData.get('password') ?? '')
  const first = str(formData.get('first_name'), 80)
  const last = str(formData.get('last_name'), 80)
  const phone = str(formData.get('phone'), 40)
  const smsOptIn = formData.get('sms_opt_in') ? 1 : 0
  if (!first || !last || !email.includes('@') || !phone) back('/signup', 'error', 'Please fill in every field.')
  if (password.length < 8) back('/signup', 'error', 'Passwords need at least 8 characters.')
  const existing = one<User>('SELECT * FROM users WHERE email = ?', email)
  if (existing) {
    back(existing.password_hash ? '/login' : '/forgot-password', 'error',
      existing.password_hash
        ? 'You already have an account. Log in below.'
        : "We already have you on file from our old system. Enter your email and we'll send a link to set your password.")
  }
  const { id } = run(
    'INSERT INTO users (email, password_hash, first_name, last_name, phone, sms_opt_in) VALUES (?, ?, ?, ?, ?, ?)',
    email, await hashPassword(password), first, last, phone, smsOptIn,
  )
  await startSession(id)
  redirect('/account/pets/new?success=' + encodeURIComponent('Welcome! Now tell us about your dog.'))
}

export async function logout() {
  await endSession()
  redirect('/')
}

export async function requestReset(formData: FormData) {
  const email = str(formData.get('email'), 200).toLowerCase()
  const user = one<User>('SELECT * FROM users WHERE email = ?', email)
  if (user) {
    const token = crypto.randomBytes(32).toString('base64url')
    run('DELETE FROM password_resets WHERE user_id = ?', user.id)
    run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      sha256(token), user.id, new Date(Date.now() + 2 * 3_600_000).toISOString())
    await sendEmail(user.email, `Set your ${BUSINESS.name} password`,
      `Hi ${user.first_name || 'there'},\n\nUse this link to set your password. It works for 2 hours.\n\n${siteUrl('/reset-password?token=' + token)}\n\nIf you didn't ask for this, you can ignore this email.\n\n${BUSINESS.name}\n${BUSINESS.phone}`)
  }
  // Same answer either way, so nobody can use this form to check who's a client.
  back('/forgot-password', 'success', 'If that email is on file, a link is on its way. Check your inbox (and spam folder).')
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')
  const retry = '/reset-password?token=' + encodeURIComponent(token)
  if (password.length < 8) back(retry, 'error', 'Passwords need at least 8 characters.')
  const row = one<{ user_id: number }>('SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > ?',
    sha256(token), new Date().toISOString())
  if (!row) back('/forgot-password', 'error', 'That link has expired. Request a new one below.')
  run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(password), row.user_id)
  run('DELETE FROM password_resets WHERE user_id = ?', row.user_id)
  run('DELETE FROM sessions WHERE user_id = ?', row.user_id)
  await startSession(row.user_id)
  redirect('/account?success=' + encodeURIComponent('Password set. Welcome back!'))
}
