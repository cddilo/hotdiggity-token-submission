import type { Metadata } from 'next'
import { requiredVaccines } from '@/lib/bookings'

export const metadata: Metadata = { title: 'Policies & Vaccine Requirements' }
export const dynamic = 'force-dynamic'

export default function Policies() {
  const vax = requiredVaccines()
  return (
    <div className="wrap section narrow">
      <div className="eyebrow">Policies</div>
      <h1>The house rules</h1>
      <p className="muted">These keep every dog safe and healthy. Thanks for reading them.</p>

      <h2>Vaccinations</h2>
      <p>Every dog must have these current through the last day of their visit:</p>
      <ul>{vax.map((v) => <li key={v}>{v}</li>)}</ul>
      <p>Upload records in your account or have your vet email them to us. We verify every record before your first stay.</p>

      <h2>Health</h2>
      <p>Dogs should be free of fleas, ticks, coughing, and contagious illness. If your dog shows signs of illness while with us, we'll call you and your vet.</p>

      <h2>Reservations & deposits</h2>
      <p>A booking is a request until we confirm it. Where a deposit applies, it holds your reservation and is credited to your bill.</p>

      <h2>Cancellations</h2>
      <p>Please give us at least 48 hours' notice for boarding and 24 hours for grooming. Holiday reservations may have a longer cancellation window.</p>

      <h2>Drop-off & pickup</h2>
      <p>We're open Monday–Saturday, 6:30 am – 6:00 pm, and closed Sundays. Dogs can't be picked up outside business hours.</p>

      <h2>Temperament</h2>
      <p>New daycare and boarding guests get a temperament check at their first visit so we can place them in the right playgroup.</p>
    </div>
  )
}
