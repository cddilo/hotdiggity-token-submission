import Flash from '@/components/Flash'
import BookingList from '@/components/BookingList'
import { all } from '@/lib/db'
import { BOOKING_VIEW_SQL, type BookingView } from '@/lib/bookings'
import { STATUS_LABEL, todayISO } from '@/lib/format'

export default async function Bookings(props: PageProps<'/admin/bookings'>) {
  const sp = await props.searchParams
  const status = typeof sp.status === 'string' ? sp.status : ''
  const from = typeof sp.from === 'string' && sp.from ? sp.from : status ? '' : todayISO()
  const to = typeof sp.to === 'string' ? sp.to : ''
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''
  const where: string[] = []
  const params: string[] = []
  if (status) { where.push('b.status = ?'); params.push(status) }
  if (from) { where.push('b.end_date >= ?'); params.push(from) }
  if (to) { where.push('b.start_date <= ?'); params.push(to) }
  if (q) {
    where.push(`(u.first_name || ' ' || u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR EXISTS (SELECT 1 FROM booking_pets bp JOIN pets p ON p.id = bp.pet_id WHERE bp.booking_id = b.id AND p.name LIKE ?))`)
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  const rows = all<BookingView>(`${BOOKING_VIEW_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY b.start_date, b.id LIMIT 300`, ...params)
  return (
    <div>
      <div className="page-head"><h1>Bookings</h1></div>
      <Flash searchParams={props.searchParams} />
      <form className="filters">
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" type="text" defaultValue={q} placeholder="Owner, dog, phone…" /></div>
        <div className="field"><label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="">Any</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={from} /></div>
        <div className="field"><label htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={to} /></div>
        <button className="btn small" type="submit">Filter</button>
      </form>
      <BookingList rows={rows} empty="No bookings match." />
    </div>
  )
}
