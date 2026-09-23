import Link from 'next/link'
import type { Metadata } from 'next'
import { BUSINESS } from '@/lib/business'

export const metadata: Metadata = { title: 'Frequently Asked Questions' }

const FAQ: [string, React.ReactNode][] = [
  ['What vaccines does my dog need?', <>Rabies, DHPP (distemper/parvo), and Bordetella, all current through the last day of the stay. Upload them in your account or bring paper copies. See <Link href="/policies">our policies</Link>.</>],
  ['What are your hours?', <>Monday through Saturday, 6:30 am to 6:00 pm. We're closed Sundays, so boarding pickups happen Monday–Saturday.</>],
  ['Is the nightly rate charged for the day I pick up?', <>No. Boarding is charged by the night. Drop off Friday morning and pick up Monday, and that's three nights.</>],
  ['Can I watch my dog while I’m away?', <>Yes. Our webcams run 24/7. <Link href="/webcams">More about webcams</Link>.</>],
  ['Can I bring my dog’s own food?', <>Please do. Sudden food changes upset stomachs. Pack pre-portioned meals and add feeding instructions to your dog's profile.</>],
  ['My dog takes medication. Is that OK?', <>Yes. List it on your dog's profile with dosage and timing, and bring it in the original labeled container.</>],
  ['How do I pay?', <>Some services take a deposit to hold your spot, which you can pay online by card. The balance is due at pickup.</>],
  ['I was a client under your old booking system. Do I need a new account?', <>We're moving everyone over. Try "Forgot password" on the <Link href="/login">login page</Link> with the email we have on file. If that doesn't work, call us at <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.</>],
]

export default function FaqPage() {
  return (
    <div className="wrap section narrow">
      <div className="eyebrow">FAQ</div>
      <h1>Questions we hear a lot</h1>
      <div className="stack" style={{ marginTop: 20 }}>
        {FAQ.map(([q, a]) => (
          <details key={q} className="card">
            <summary style={{ fontWeight: 800, cursor: 'pointer' }}>{q}</summary>
            <p style={{ margin: '10px 0 0' }}>{a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
