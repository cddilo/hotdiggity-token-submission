import Link from 'next/link'
import type { Metadata } from 'next'
import Flash from '@/components/Flash'
import { login } from '@/lib/auth-actions'

export const metadata: Metadata = { title: 'Log In' }

export default async function Login(props: PageProps<'/login'>) {
  const sp = await props.searchParams
  const next = typeof sp.next === 'string' ? sp.next : ''
  return (
    <div className="wrap section" style={{ maxWidth: 460 }}>
      <h1>Log in</h1>
      <Flash searchParams={props.searchParams} />
      <form action={login} className="form card">
        <input type="hidden" name="next" value={next} />
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
        <button className="btn" type="submit">Log in</button>
        <div className="small"><Link href="/forgot-password">Forgot password, or first time since we switched systems?</Link></div>
      </form>
      <p className="center" style={{ marginTop: 18 }}>New to Hot Diggity? <Link href="/signup">Create an account</Link></p>
    </div>
  )
}
