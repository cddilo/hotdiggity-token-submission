import Link from 'next/link'
import Flash from '@/components/Flash'
import { all } from '@/lib/db'

export default async function Clients(props: PageProps<'/admin/clients'>) {
  const sp = await props.searchParams
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''
  const like = `%${q}%`
  const rows = all<{ id: number; first_name: string; last_name: string; email: string; phone: string; pets: string | null; visits: number; role: string }>(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role,
       (SELECT GROUP_CONCAT(name, ', ') FROM pets WHERE owner_id = u.id AND active = 1) AS pets,
       (SELECT COUNT(*) FROM bookings WHERE user_id = u.id AND status = 'checked_out') AS visits
     FROM users u
     WHERE ? = '' OR u.first_name || ' ' || u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?
        OR EXISTS (SELECT 1 FROM pets p WHERE p.owner_id = u.id AND p.name LIKE ?)
     ORDER BY u.last_name, u.first_name LIMIT 300`, q, like, like, like, like)
  return (
    <div>
      <div className="page-head">
        <h1>Clients & dogs</h1>
        <Link href="/admin/clients/new" className="btn small">Add client</Link>
      </div>
      <Flash searchParams={props.searchParams} />
      <form className="filters">
        <div className="field" style={{ flex: 1 }}><label htmlFor="q">Search by owner, dog, email, or phone</label><input id="q" name="q" type="text" defaultValue={q} /></div>
        <button className="btn small" type="submit">Search</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Owner</th><th>Dogs</th><th>Phone</th><th>Email</th><th className="num">Visits</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/clients/${r.id}`}>{r.last_name}, {r.first_name}</Link>{r.role !== 'customer' && <span className="pill" style={{ marginLeft: 6 }}>{r.role}</span>}</td>
                <td>{r.pets ?? '—'}</td>
                <td>{r.phone}</td>
                <td>{r.email}</td>
                <td className="num">{r.visits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
