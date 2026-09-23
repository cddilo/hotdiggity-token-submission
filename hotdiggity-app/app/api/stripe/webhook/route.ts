// Stripe calls this after a customer pays. The signature check proves it's really Stripe.
import { recordStripePayment, stripe, stripeEnabled } from '@/lib/payments'
import { one } from '@/lib/db'
import { notifyStaff } from '@/lib/notify'
import { money } from '@/lib/format'

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeEnabled() || !secret) return new Response('Stripe not configured', { status: 503 })
  const body = await req.text()
  let event
  try {
    event = stripe().webhooks.constructEvent(body, req.headers.get('stripe-signature') ?? '', secret)
  } catch {
    return new Response('Bad signature', { status: 400 })
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object
    const bookingId = Number(s.metadata?.booking_id)
    if (s.payment_status === 'paid' && bookingId && one('SELECT id FROM bookings WHERE id = ?', bookingId)) {
      recordStripePayment(s.id, bookingId, s.amount_total ?? 0)
      await notifyStaff(`Deposit paid: booking #${bookingId}`, `${money(s.amount_total ?? 0)} paid online by ${s.customer_details?.email ?? 'customer'}.`)
    }
  }
  return Response.json({ received: true })
}
