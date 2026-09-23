import Link from 'next/link'
import Flash from '@/components/Flash'
import BookingList from '@/components/BookingList'
import { all, getSetting, one } from '@/lib/db'
import { BOOKING_VIEW_SQL, requiredVaccines, type BookingView } from '@/lib/bookings'
import { addDays, money, niceDate, todayISO } from '@/lib/format'
import { sendReminders } from '@/lib/admin-actions'

export default async function Today(props: PageProps<'/admin'>) {
  const today = todayISO()
  const arriving = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.start_date = ? AND b.status IN ('confirmed','requested') ORDER BY b.dropoff_time`, today)
  const leaving = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.end_date = ? AND b.status = 'checked_in' ORDER BY b.pickup_time`, today)
  const inHouse = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.status = 'checked_in' ORDER BY s.category, b.end_date`)
  const requests = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.status = 'requested' ORDER BY b.start_date LIMIT 10`)
  const overdue = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.status = 'checked_in' AND b.end_date < ?`, today)
  const req = requiredVaccines()
  const soon = addDays(today, 14)
  const expiring = all<{ pet_id: number; pet_name: string; owner_id: number; first_name: string; last_name: string; kind: string; expires_on: string }>(
    `SELECT p.id AS pet_id, p.name AS pet_name, u.id AS owner_id, u.first_name, u.last_name, v.kind, MAX(v.expires_on) AS expires_on
     FROM vaccinations v JOIN pets p ON p.id = v.pet_id JOIN users u ON u.id = p.owner_id
     WHERE p.id IN (SELECT pet_id FROM booking_pets bp JOIN bookings b ON b.id = bp.booking_id WHERE b.status IN ('requested','confirmed','checked_in') AND b.end_date >= ?)
     GROUP BY p.id, v.kind HAVING MAX(v.expires_on) <= ? ORDER BY expires_on`, today, soon)
    .filter((r) => req.includes(r.kind))
  const monthStart = today.slice(0, 7) + '-01'
  const month = one<{ c: number }>('SELECT COALESCE(SUM(amount_cents),0) AS c FROM payments WHERE created_at >= ?', monthStart)!.c
  const pricesReviewed = getSetting('prices_reviewed') === '1'

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Today · {niceDate(today)}</h1>
        <form action={sendReminders}><button className="btn secondary small">Send tomorrow's reminders</button></form>
      </div>
      <Flash searchParams={props.searchParams} />
      {!pricesReviewed && (
        <div className="alert info">The price list is still the starter placeholder. <Link href="/admin/services">Review your services & prices →</Link></div>
      )}
      <div className="grid four">
        <div className="stat"><div className="n">{arriving.length}</div><div className="l">Arriving today</div></div>
        <div className="stat"><div className="n">{leaving.length}</div><div className="l">Going home today</div></div>
        <div className="stat"><div className="n">{inHouse.length}</div><div className="l">In the building</div></div>
        <div className="stat"><div className="n">{money(month)}</div><div className="l">Collected this month</div></div>
      </div>

      {overdue.length > 0 && <div className="alert error">⚠️ {overdue.length} dog{overdue.length > 1 ? 's are' : ' is'} past the pickup date and still checked in: {overdue.map((b) => b.pet_names).join(', ')}.</div>}

      <section><h2>Arriving</h2><BookingList rows={arriving} empty="No arrivals today." time="dropoff" /></section>
      <section><h2>Going home</h2><BookingList rows={leaving} empty="No departures today." time="pickup" /></section>
      <section>
        <div className="page-head" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>Waiting for your answer</h2><Link href="/admin/bookings?status=requested">See all</Link></div>
        <BookingList rows={requests} empty="No open requests. Nice." />
      </section>
      <section><h2>In the building</h2><BookingList rows={inHouse} empty="Nobody checked in." /></section>
      {expiring.length > 0 && (
        <section>
          <h2>Shots expiring soon (booked dogs)</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Dog</th><th>Owner</th><th>Vaccine</th><th>Expires</th></tr></thead>
            <tbody>{expiring.map((r) => (
              <tr key={r.pet_id + r.kind}><td>{r.pet_name}</td><td><Link href={`/admin/clients/${r.owner_id}`}>{r.first_name} {r.last_name}</Link></td><td>{r.kind}</td>
                <td><span className={`pill ${r.expires_on < today ? 'bad' : 'warn'}`}>{niceDate(r.expires_on)}</span></td></tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </div>
  )
}
