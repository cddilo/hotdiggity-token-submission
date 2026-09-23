import Link from 'next/link'
import type { BookingView } from '@/lib/bookings'
import { money, niceDate, niceTime, STATUS_LABEL } from '@/lib/format'

export default function BookingList({ rows, empty, time }: { rows: BookingView[]; empty: string; time?: 'dropoff' | 'pickup' }) {
  if (!rows.length) return <p className="muted">{empty}</p>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>Dogs</th><th>Owner</th><th>Service</th><th>Dates</th>{time && <th>Time</th>}<th>Status</th><th className="num">Balance</th></tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/admin/bookings/${b.id}`}>{b.id}</Link></td>
              <td><Link href={`/admin/bookings/${b.id}`}><strong>{b.pet_names}</strong></Link></td>
              <td><Link href={`/admin/clients/${b.user_id}`}>{b.first_name} {b.last_name}</Link><div className="small muted">{b.phone}</div></td>
              <td>{b.service_name}</td>
              <td>{niceDate(b.start_date)}{b.end_date !== b.start_date && <><br />→ {niceDate(b.end_date)}</>}</td>
              {time && <td>{niceTime(time === 'dropoff' ? b.dropoff_time : b.pickup_time) || '—'}</td>}
              <td><span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span></td>
              <td className="num">{money(Math.max(0, b.total_cents - b.paid_cents))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
