import { notFound } from 'next/navigation'
import Flash from '@/components/Flash'
import { requireUser } from '@/lib/auth'
import { all, one } from '@/lib/db'
import { BOOKING_VIEW_SQL, type BookingView } from '@/lib/bookings'
import { cancelBooking, payDeposit } from '@/lib/customer-actions'
import { stripeEnabled } from '@/lib/payments'
import { money, niceDate, niceTime, STATUS_LABEL } from '@/lib/format'
import { BUSINESS } from '@/lib/business'

export default async function BookingDetail(props: PageProps<'/account/bookings/[id]'>) {
  const user = await requireUser()
  const { id } = await props.params
  const sp = await props.searchParams
  const b = one<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.id = ? AND b.user_id = ?`, Number(id), user.id)
  if (!b) notFound()
  const cards = all<{ id: number; day: string; pet_name: string; ate: string; mood: string; note: string }>(
    'SELECT r.*, p.name AS pet_name FROM report_cards r JOIN pets p ON p.id = r.pet_id WHERE r.booking_id = ? ORDER BY r.day DESC, r.id DESC', b.id)
  const depositOwed = Math.max(0, b.deposit_cents - b.paid_cents)
  const balance = Math.max(0, b.total_cents - b.paid_cents)
  const open = b.status === 'requested' || b.status === 'confirmed'

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{b.service_name}</h1>
        <span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span>
      </div>
      <Flash searchParams={props.searchParams} />
      {sp.paid === '1' && <div className="alert success">Payment received. Thank you! It can take a minute to show below.</div>}
      {b.status === 'requested' && <div className="alert info">We have your request and will confirm soon. You'll get an email{user.sms_opt_in ? ' and a text' : ''}.</div>}

      <div className="card">
        <dl className="facts">
          <dt>Dogs</dt><dd>{b.pet_names}</dd>
          <dt>{b.start_date === b.end_date ? 'Date' : 'Dates'}</dt>
          <dd>{niceDate(b.start_date)}{b.end_date !== b.start_date && <> – {niceDate(b.end_date)}</>}</dd>
          {b.dropoff_time && <><dt>Drop-off</dt><dd>{niceTime(b.dropoff_time)}</dd></>}
          {b.pickup_time && <><dt>Pickup</dt><dd>{niceTime(b.pickup_time)}</dd></>}
          {b.customer_notes && <><dt>Your notes</dt><dd>{b.customer_notes}</dd></>}
          <dt>Total</dt><dd>{money(b.total_cents)}</dd>
          <dt>Paid</dt><dd>{money(b.paid_cents)}</dd>
          <dt>Balance</dt><dd>{money(balance)}{balance > 0 && ' (due at pickup)'}</dd>
        </dl>
      </div>

      {open && depositOwed > 0 && (
        <div className="card">
          <h3>Deposit: {money(depositOwed)}</h3>
          {stripeEnabled() ? (
            <form action={payDeposit}>
              <input type="hidden" name="id" value={b.id} />
              <p className="muted">Your deposit holds your spot and comes off your final bill.</p>
              <button className="btn" type="submit">Pay deposit by card</button>
            </form>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Call us at <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a> to pay your deposit, or pay at drop-off.</p>
          )}
        </div>
      )}

      {cards.length > 0 && (
        <section>
          <h2>Report cards</h2>
          <div className="stack">
            {cards.map((c) => (
              <div key={c.id} className="card">
                <h3>{c.pet_name} · {niceDate(c.day)}</h3>
                {c.mood && <div><strong>Mood:</strong> {c.mood}</div>}
                {c.ate && <div><strong>Meals:</strong> {c.ate}</div>}
                {c.note && <p style={{ margin: '8px 0 0' }}>{c.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {open && (
        <form action={cancelBooking}>
          <input type="hidden" name="id" value={b.id} />
          <button className="btn secondary small" type="submit">Cancel this booking</button>
          <p className="hint">Please see our cancellation policy. Deposits may be non-refundable close to the date.</p>
        </form>
      )}
    </div>
  )
}
