import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { logout } from '@/lib/auth-actions'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <div className="wrap office">
      <nav className="office-nav" aria-label="Account">
        <div className="sep">Hi, {user.first_name || 'there'}</div>
        <Link href="/account">Overview</Link>
        <Link href="/account/book">Book a stay</Link>
        <Link href="/account/pets/new">Add a dog</Link>
        <Link href="/account/profile">My details</Link>
        <form action={logout}><button className="btn ghost" style={{ padding: '8px 12px' }}>Log out</button></form>
      </nav>
      <div>{children}</div>
    </div>
  )
}
