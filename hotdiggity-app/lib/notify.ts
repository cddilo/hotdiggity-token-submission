// Email and text messages. Each channel switches on when its keys are in .env;
// until then messages are written to the notifications log (Admin > Messages) so nothing is lost.
import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import { run } from './db'
import { BUSINESS } from './business'

function log(channel: string, recipient: string, subject: string, body: string, status: string) {
  run('INSERT INTO notifications (channel, recipient, subject, body, status) VALUES (?, ?, ?, ?, ?)',
    channel, recipient, subject, body, status)
}

let transport: Transporter | null | undefined
function mailer() {
  if (transport !== undefined) return transport
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  transport = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : null
  return transport
}

export async function sendEmail(to: string, subject: string, text: string) {
  if (!to) return
  const t = mailer()
  if (!t) return log('email', to, subject, text, 'not sent: email not set up')
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || `${BUSINESS.name} <${BUSINESS.email}>`, to, subject, text })
    log('email', to, subject, text, 'sent')
  } catch (e) {
    log('email', to, subject, text, 'failed: ' + (e as Error).message)
  }
}

function e164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  return null
}

export async function sendText(phone: string, body: string) {
  const to = e164(phone)
  if (!to) return
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = process.env
  if (!sid || !token || !from) return log('sms', to, '', body, 'not sent: texting not set up')
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })
    log('sms', to, '', body, res.ok ? 'sent' : `failed: HTTP ${res.status}`)
  } catch (e) {
    log('sms', to, '', body, 'failed: ' + (e as Error).message)
  }
}

export async function notifyStaff(subject: string, text: string) {
  const to = process.env.STAFF_EMAIL
  if (to) await sendEmail(to, subject, text)
  else log('email', 'staff', subject, text, 'not sent: STAFF_EMAIL not set')
}

export function siteUrl(path = ''): string {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '') + path
}
