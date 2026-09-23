import Link from 'next/link'
import { getSetting } from '@/lib/db'
import { usageByDate } from '@/lib/bookings'
import { addDays, isISODate, niceDate, todayISO, weekday } from '@/lib/format'

// Six weeks of how full we are, so the desk can answer "do you have room?" at a glance.
export default async function Occupancy(props: PageProps<'/admin/calendar'>) {
  const sp = await props.searchParams
  const start = typeof sp.from === 'string' && isISODate(sp.from) ? sp.from : todayISO()
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const end = days[days.length - 1]
  const board = usageByDate('boarding', start, end)
  const day = usageByDate('daycare', start, end)
  const groom = usageByDate('grooming', start, end)
  const cap = { b: Number(getSetting('boarding_capacity')), d: Number(getSetting('daycare_capacity')), g: Number(getSetting('grooming_per_day')) }
  const cell = (n: number, c: number) => {
    const pct = c ? n / c : 0
    const cls = pct >= 1 ? 'bad' : pct >= 0.8 ? 'warn' : 'ok'
    return <span className={`pill ${n ? cls : ''}`}>{n}/{c}</span>
  }
  return (
    <div>
      <div className="page-head">
        <h1>Occupancy</h1>
        <div className="btn-row">
          <Link className="btn secondary small" href={`/admin/calendar?from=${addDays(start, -42)}`}>← Earlier</Link>
          <Link className="btn secondary small" href="/admin/calendar">Today</Link>
          <Link className="btn secondary small" href={`/admin/calendar?from=${addDays(start, 42)}`}>Later →</Link>
        </div>
      </div>
      <p className="muted small">Counts include requests that haven't been confirmed yet. Boarding counts nights (pickup day is free).</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Boarding (dogs)</th><th>Daycare (dogs)</th><th>Grooming (appts)</th></tr></thead>
          <tbody>
            {days.map((d) => weekday(d) === 0 ? (
              <tr key={d}><td className="muted">{niceDate(d)}</td><td colSpan={3} className="muted">Closed (boarders stay over)&nbsp;{board.get(d) ? cell(board.get(d)!, cap.b) : null}</td></tr>
            ) : (
              <tr key={d}>
                <td><Link href={`/admin/bookings?from=${d}&to=${d}`}>{niceDate(d)}</Link></td>
                <td>{cell(board.get(d) ?? 0, cap.b)}</td>
                <td>{cell(day.get(d) ?? 0, cap.d)}</td>
                <td>{cell(groom.get(d) ?? 0, cap.g)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
