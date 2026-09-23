import Link from 'next/link'
import { notFound } from 'next/navigation'
import Flash from '@/components/Flash'
import { all, one } from '@/lib/db'
import { BOOKING_VIEW_SQL, bookingPets, vaccineStatus, type BookingView } from '@/lib/bookings'
import { addReportCard, recordPayment, setBookingStatus, updateBooking } from '@/lib/admin-actions'
import { money, niceDate, STATUS_LABEL } from '@/lib/format'

const NEXT_STEPS: Record<string, { to: string; label: string; cls: string }[]> = {
  requested: [{ to: 'confirmed', label: 'Confirm', cls: 'ok' }, { to: 'declined', label: 'Decline', cls: 'danger' }],
  confirmed: [{ to: 'checked_in', label: 'Check in', cls: 'ok' }, { to: 'cancelled', label: 'Cancel', cls: 'danger' }],
  checked_in: [{ to: 'checked_out', label: 'Check out', cls: 'ok' }],
  cancelled: [{ to: 'requested', label: 'Reopen', cls: 'secondary' }],
  declined: [{ to: 'requested', label: 'Reopen', cls: 'secondary' }],
  checked_out: [],
}

export default async function AdminBooking(props: PageProps<'/admin/bookings/[id]'>) {
  const { id } = await props.params
  const b = one<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.id = ?`, Number(id))
  if (!b) notFound()
  const pets = bookingPets(b.id)
  const payments = all<{ id: number; amount_cents: number; method: string; reference: string; created_at: string }>(
    'SELECT * FROM payments WHERE booking_id = ? ORDER BY id', b.id)
  const cards = all<{ id: number; day: string; pet_name: string; mood: string; ate: string; note: string }>(
    'SELECT r.*, p.name AS pet_name FROM report_cards r JOIN pets p ON p.id = r.pet_id WHERE booking_id = ? ORDER BY r.id DESC', b.id)
  const balance = b.total_cents - b.paid_cents
  const steps = NEXT_STEPS[b.status] ?? []

  return (
    <div className="stack">
      <div className="page-head">
        <h1>#{b.id} · {b.pet_names}</h1>
        <span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span>
      </div>
      <Flash searchParams={props.searchParams} />

      <div className="grid two">
        <div className="card">
          <h3>{b.service_name}</h3>
          <dl className="facts">
            <dt>Owner</dt><dd><Link href={`/admin/clients/${b.user_id}`}>{b.first_name} {b.last_name}</Link></dd>
            <dt>Phone</dt><dd><a href={`tel:${b.phone}`}>{b.phone}</a></dd>
            <dt>Email</dt><dd><a href={`mailto:${b.email}`}>{b.email}</a></dd>
            <dt>Dates</dt><dd>{niceDate(b.start_date)}{b.end_date !== b.start_date && <> → {niceDate(b.end_date)}</>}</dd>
            {b.customer_notes && <><dt>Client notes</dt><dd>{b.customer_notes}</dd></>}
            <dt>Total</dt><dd>{money(b.total_cents)}</dd>
            <dt>Deposit</dt><dd>{money(b.deposit_cents)}</dd>
            <dt>Paid</dt><dd>{money(b.paid_cents)}</dd>
            <dt>Balance</dt><dd><strong>{money(balance)}</strong></dd>
          </dl>
        </div>

        <div className="card stack">
          <h3>Next step</h3>
          {steps.length === 0 && <p className="muted">This booking is finished.</p>}
          {steps.map((s) => (
            <form key={s.to} action={setBookingStatus} className="form">
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="status" value={s.to} />
              {(s.to === 'declined' || s.to === 'cancelled' || s.to === 'confirmed') && (
                <input type="text" name="message" placeholder={s.to === 'confirmed' ? 'Optional note to the client' : 'Reason (sent to the client)'} />
              )}
              {s.to === 'confirmed' && <label className="check small"><input type="checkbox" name="override" /> Confirm anyway, even if over capacity</label>}
              {s.to === 'checked_out' && balance > 0 && <div className="alert info" style={{ margin: 0 }}>Collect {money(balance)} before checkout.</div>}
              <div><button className={`btn ${s.cls}`} type="submit">{s.label}</button></div>
            </form>
          ))}
        </div>
      </div>

      <section>
        <h2>Dogs on this booking</h2>
        <div className="grid two">
          {pets.map((p) => {
            const vax = vaccineStatus(p.id, b.end_date)
            return (
              <div key={p.id} className="card">
                <h3>{p.name} <span className="muted small">{p.breed}</span></h3>
                <div className="btn-row" style={{ marginBottom: 8 }}>
                  {vax.map((v) => (
                    <span key={v.kind} className={`pill ${!v.ok ? 'bad' : v.verified ? 'ok' : 'warn'}`}>
                      {v.kind}: {v.expires_on ? niceDate(v.expires_on) : 'missing'}{v.ok && !v.verified ? ' (unverified)' : ''}
                    </span>
                  ))}
                  {!p.temperament_ok && <span className="pill warn">Temperament check needed</span>}
                </div>
                <dl className="facts small">
                  {p.feeding && <><dt>Feeding</dt><dd>{p.feeding}</dd></>}
                  {p.medications && <><dt>Meds</dt><dd>{p.medications}</dd></>}
                  {p.allergies && <><dt>Allergies</dt><dd>{p.allergies}</dd></>}
                  {p.behavior && <><dt>Notes</dt><dd>{p.behavior}</dd></>}
                  {p.staff_notes && <><dt>Staff</dt><dd>{p.staff_notes}</dd></>}
                  {p.vet_name && <><dt>Vet</dt><dd>{p.vet_name} {p.vet_phone}</dd></>}
                </dl>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid two">
        <section className="card">
          <h3>Take a payment</h3>
          <form action={recordPayment} className="form">
            <input type="hidden" name="id" value={b.id} />
            <div className="row">
              <div className="field"><label htmlFor="amount">Amount</label><input id="amount" name="amount" type="text" inputMode="decimal" defaultValue={balance > 0 ? (balance / 100).toFixed(2) : ''} required /></div>
              <div className="field"><label htmlFor="method">Method</label>
                <select id="method" name="method"><option>card (in store)</option><option>cash</option><option>check</option><option>Zelle/Venmo</option><option>gift card</option></select>
              </div>
            </div>
            <div className="field"><label htmlFor="reference">Reference (check #, last 4…)</label><input id="reference" name="reference" type="text" /></div>
            <label className="check small"><input type="checkbox" name="refund" value="1" /> This is a refund</label>
            <div><button className="btn" type="submit">Record</button></div>
          </form>
          {payments.length > 0 && (
            <table style={{ marginTop: 12 }}><tbody>
              {payments.map((p) => (
                <tr key={p.id}><td>{p.created_at.slice(0, 10)}</td><td>{p.method}{p.reference && ` · ${p.reference.slice(0, 24)}`}</td><td className="num">{money(p.amount_cents)}</td></tr>
              ))}
            </tbody></table>
          )}
        </section>

        <section className="card">
          <h3>Edit booking</h3>
          <form action={updateBooking} className="form">
            <input type="hidden" name="id" value={b.id} />
            <div className="row">
              <div className="field"><label htmlFor="start_date">Start</label><input id="start_date" name="start_date" type="date" defaultValue={b.start_date} /></div>
              <div className="field"><label htmlFor="end_date">End</label><input id="end_date" name="end_date" type="date" defaultValue={b.end_date} /></div>
            </div>
            <div className="row">
              <div className="field"><label htmlFor="dropoff_time">Drop-off</label><input id="dropoff_time" name="dropoff_time" type="time" defaultValue={b.dropoff_time} /></div>
              <div className="field"><label htmlFor="pickup_time">Pickup</label><input id="pickup_time" name="pickup_time" type="time" defaultValue={b.pickup_time} /></div>
            </div>
            <div className="row">
              <div className="field"><label htmlFor="total">Total (blank = recalculate)</label><input id="total" name="total" type="text" inputMode="decimal" placeholder={(b.total_cents / 100).toFixed(2)} /></div>
              <div className="field"><label htmlFor="deposit">Deposit</label><input id="deposit" name="deposit" type="text" inputMode="decimal" defaultValue={(b.deposit_cents / 100).toFixed(2)} /></div>
            </div>
            <div className="field"><label htmlFor="staff_notes">Staff notes (private)</label><textarea id="staff_notes" name="staff_notes" defaultValue={b.staff_notes} /></div>
            <div><button className="btn secondary" type="submit">Save changes</button></div>
          </form>
        </section>
      </div>

      {(b.status === 'checked_in' || cards.length > 0) && (
        <section className="card">
          <h3>Report cards</h3>
          {b.status === 'checked_in' && (
            <form action={addReportCard} className="form">
              <input type="hidden" name="id" value={b.id} />
              <div className="row">
                <div className="field"><label htmlFor="pet_id">Dog</label>
                  <select id="pet_id" name="pet_id">{pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
                <div className="field"><label htmlFor="mood">Mood</label><input id="mood" name="mood" type="text" placeholder="Happy and playful" /></div>
                <div className="field"><label htmlFor="ate">Meals</label><input id="ate" name="ate" type="text" placeholder="Ate all breakfast and dinner" /></div>
              </div>
              <div className="field"><label htmlFor="note">Note to the owner</label><textarea id="note" name="note" /></div>
              <label className="check small"><input type="checkbox" name="send" defaultChecked /> Email/text it to the owner now</label>
              <div><button className="btn" type="submit">Save report card</button></div>
            </form>
          )}
          {cards.map((c) => (
            <div key={c.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
              <strong>{c.pet_name}</strong> · {niceDate(c.day)} · {c.mood} · {c.ate}
              {c.note && <div className="muted">{c.note}</div>}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
