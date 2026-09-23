import Link from 'next/link'
import Flash from '@/components/Flash'
import { requireUser } from '@/lib/auth'
import { all, type Pet } from '@/lib/db'
import { BOOKING_VIEW_SQL, vaccineStatus, type BookingView } from '@/lib/bookings'
import { money, niceDate, STATUS_LABEL, todayISO } from '@/lib/format'

export default async function AccountHome(props: PageProps<'/account'>) {
  const user = await requireUser()
  const today = todayISO()
  const pets = all<Pet>('SELECT * FROM pets WHERE owner_id = ? AND active = 1 ORDER BY name', user.id)
  const upcoming = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.user_id = ? AND b.end_date >= ? AND b.status IN ('requested','confirmed','checked_in') ORDER BY b.start_date`, user.id, today)
  const past = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.user_id = ? AND NOT (b.end_date >= ? AND b.status IN ('requested','confirmed','checked_in')) ORDER BY b.start_date DESC LIMIT 20`, user.id, today)

  return (
    <div className="stack">
      <div className="page-head">
        <h1>My account</h1>
        <Link href="/account/book" className="btn">Book a stay</Link>
      </div>
      <Flash searchParams={props.searchParams} />

      <section>
        <h2>My dogs</h2>
        {pets.length === 0 ? (
          <div className="alert info">Add your dog to get started. <Link href="/account/pets/new">Add a dog →</Link></div>
        ) : (
          <div className="grid three">
            {pets.map((p) => {
              const vax = vaccineStatus(p.id, today)
              const ok = vax.every((v) => v.ok)
              return (
                <Link key={p.id} href={`/account/pets/${p.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3>🐶 {p.name}</h3>
                  <div className="muted small">{p.breed || 'Breed not set'}</div>
                  <div style={{ marginTop: 8 }}>
                    {ok ? <span className="pill ok">Shots on file</span> : <span className="pill bad">Shot records needed</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2>Upcoming</h2>
        {upcoming.length === 0 ? <p className="muted">Nothing on the calendar yet.</p> : <BookingTable rows={upcoming} />}
      </section>

      {past.length > 0 && (
        <section>
          <h2>History</h2>
          <BookingTable rows={past} />
        </section>
      )}
    </div>
  )
}

function BookingTable({ rows }: { rows: BookingView[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Dates</th><th>Service</th><th>Dogs</th><th>Status</th><th className="num">Total</th></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/account/bookings/${b.id}`}>{niceDate(b.start_date)}{b.end_date !== b.start_date && <> – {niceDate(b.end_date)}</>}</Link></td>
              <td>{b.service_name}</td>
              <td>{b.pet_names}</td>
              <td><span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span></td>
              <td className="num">{money(b.total_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
