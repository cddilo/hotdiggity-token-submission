import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { one } from '@/lib/db'
import { logout } from '@/lib/auth-actions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff()
  const pending = one<{ n: number }>("SELECT COUNT(*) AS n FROM bookings WHERE status = 'requested'")!.n
  const vax = one<{ n: number }>('SELECT COUNT(*) AS n FROM vaccinations WHERE verified = 0')!.n
  const msgs = one<{ n: number }>('SELECT COUNT(*) AS n FROM contact_messages WHERE handled = 0')!.n
  const badge = (n: number) => (n ? <span className="pill requested" style={{ marginLeft: 6 }}>{n}</span> : null)
  return (
    <div className="wrap office">
      <nav className="office-nav" aria-label="Front desk">
        <div className="sep">Front desk</div>
        <Link href="/admin">Today</Link>
        <Link href="/admin/bookings?status=requested">Requests{badge(pending)}</Link>
        <Link href="/admin/bookings">All bookings</Link>
        <Link href="/admin/calendar">Occupancy</Link>
        <Link href="/admin/clients">Clients & dogs</Link>
        <Link href="/admin/vaccines">Shot records{badge(vax)}</Link>
        <Link href="/admin/messages">Messages{badge(msgs)}</Link>
        <div className="sep">Business</div>
        <Link href="/admin/reports">Sales reports</Link>
        {user.role === 'admin' && <Link href="/admin/services">Services & prices</Link>}
        {user.role === 'admin' && <Link href="/admin/settings">Settings & staff</Link>}
        <form action={logout}><button className="btn ghost" style={{ padding: '8px 12px' }}>Log out</button></form>
      </nav>
      <div>{children}</div>
    </div>
  )
}
