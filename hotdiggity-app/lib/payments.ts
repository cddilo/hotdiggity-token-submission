// Online deposits through Stripe Checkout. Card numbers never touch this server:
// Stripe hosts the payment page and tells us afterward what was paid.
import 'server-only'
import Stripe from 'stripe'
import { one, run, tx, type Booking } from './db'
import { siteUrl } from './notify'

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

let client: Stripe | null = null
export function stripe(): Stripe {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return client
}

export async function checkoutUrl(booking: Booking, description: string, amountCents: number, email: string): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: amountCents, product_data: { name: description } },
    }],
    metadata: { booking_id: String(booking.id) },
    success_url: siteUrl(`/account/bookings/${booking.id}?paid=1`),
    cancel_url: siteUrl(`/account/bookings/${booking.id}`),
  })
  run('UPDATE bookings SET stripe_session_id = ? WHERE id = ?', session.id, booking.id)
  return session.url!
}

// Called from the Stripe webhook. Safe to call twice for the same session.
export function recordStripePayment(sessionId: string, bookingId: number, amountCents: number) {
  tx(() => {
    const already = one('SELECT id FROM payments WHERE reference = ?', sessionId)
    if (already) return
    run('INSERT INTO payments (booking_id, amount_cents, method, reference) VALUES (?, ?, ?, ?)',
      bookingId, amountCents, 'card (online)', sessionId)
    run("UPDATE bookings SET paid_cents = paid_cents + ?, updated_at = datetime('now') WHERE id = ?", amountCents, bookingId)
  })
}
