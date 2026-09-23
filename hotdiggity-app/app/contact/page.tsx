import { Fragment } from 'react'
import type { Metadata } from 'next'
import Flash from '@/components/Flash'
import { BUSINESS, fullAddress } from '@/lib/business'
import { run } from '@/lib/db'
import { str } from '@/lib/format'
import { back } from '@/lib/flash'
import { notifyStaff } from '@/lib/notify'

export const metadata: Metadata = { title: 'Contact Us' }

async function sendMessage(formData: FormData) {
  'use server'
  // Bots fill every field, including the hidden one.
  if (str(formData.get('website'))) back('/contact', 'success', 'Thanks! We got your message.')
  const name = str(formData.get('name'), 120)
  const email = str(formData.get('email'), 200)
  const phone = str(formData.get('phone'), 40)
  const message = str(formData.get('message'), 4000)
  if (!name || !email.includes('@') || !message) back('/contact', 'error', 'Please fill in your name, email, and a message.')
  run('INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)', name, email, phone, message)
  await notifyStaff(`Website message from ${name}`, `${name}\n${email}\n${phone}\n\n${message}`)
  back('/contact', 'success', "Thanks! We got your message and we'll get back to you soon.")
}

export default function Contact(props: PageProps<'/contact'>) {
  return (
    <div className="wrap section">
      <div className="grid two">
        <div>
          <div className="eyebrow">Contact</div>
          <h1>Come see us</h1>
          <p>
            Tours are welcome during business hours. Honestly, we recommend one. You'll learn more in five minutes
            walking through than from any website.
          </p>
          <dl className="facts">
            <dt>Address</dt><dd><a href={BUSINESS.mapsUrl} target="_blank" rel="noopener">{fullAddress}</a></dd>
            <dt>Phone</dt><dd><a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a></dd>
            <dt>Email</dt><dd><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></dd>
            {BUSINESS.hours.map(([d, h]) => (<Fragment key={d}><dt>{d}</dt><dd>{h}</dd></Fragment>))}
          </dl>
        </div>
        <div className="card">
          <h2>Send a message</h2>
          <Flash searchParams={props.searchParams} />
          <form action={sendMessage} className="form">
            <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" type="text" required /></div>
            <div className="row">
              <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" /></div>
            </div>
            <div className="field"><label htmlFor="message">Message</label><textarea id="message" name="message" required /></div>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} aria-hidden />
            <button className="btn" type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  )
}
