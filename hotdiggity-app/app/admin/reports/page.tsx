import { all } from '@/lib/db'
import { money } from '@/lib/format'

// Monthly numbers for the books: money actually collected, and the work behind it.
export default async function Reports() {
  const collected = all<{ month: string; cents: number; n: number }>(
    `SELECT substr(created_at, 1, 7) AS month, SUM(amount_cents) AS cents, COUNT(*) AS n FROM payments GROUP BY month ORDER BY month DESC LIMIT 24`)
  const byCategory = all<{ month: string; category: string; stays: number; billed: number }>(
    `SELECT substr(b.start_date, 1, 7) AS month, s.category, COUNT(*) AS stays, SUM(b.total_cents) AS billed
     FROM bookings b JOIN services s ON s.id = b.service_id
     WHERE b.status IN ('confirmed','checked_in','checked_out')
     GROUP BY month, s.category ORDER BY month DESC, s.category LIMIT 120`)
  const byMethod = all<{ method: string; cents: number }>(
    `SELECT method, SUM(amount_cents) AS cents FROM payments WHERE created_at >= date('now', 'start of year') GROUP BY method ORDER BY cents DESC`)
  const cats = ['boarding', 'daycare', 'grooming', 'training', 'wellness']
  const months = [...new Set(byCategory.map((r) => r.month))]
  return (
    <div className="stack">
      <h1>Sales reports</h1>
      <section>
        <h2>Collected by month</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th><th className="num">Payments</th><th className="num">Collected</th></tr></thead>
          <tbody>{collected.map((r) => <tr key={r.month}><td>{r.month}</td><td className="num">{r.n}</td><td className="num">{money(r.cents)}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section>
        <h2>Booked revenue by service line</h2>
        <p className="muted small">By the month the stay starts. Excludes requests, cancellations, and declines.</p>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th>{cats.map((c) => <th key={c} className="num">{c}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>{months.map((m) => {
            const rows = byCategory.filter((r) => r.month === m)
            return (
              <tr key={m}><td>{m}</td>
                {cats.map((c) => { const r = rows.find((x) => x.category === c); return <td key={c} className="num">{r ? <>{money(r.billed)}<div className="small muted">{r.stays} bookings</div></> : '—'}</td> })}
                <td className="num"><strong>{money(rows.reduce((s, r) => s + r.billed, 0))}</strong></td>
              </tr>
            )
          })}</tbody>
        </table></div>
      </section>
      <section>
        <h2>Year to date by payment method</h2>
        <div className="table-wrap"><table>
          <tbody>{byMethod.map((r) => <tr key={r.method}><td>{r.method}</td><td className="num">{money(r.cents)}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  )
}
