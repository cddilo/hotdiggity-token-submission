import type { Metadata } from 'next'
import Flash from '@/components/Flash'
import { resetPassword } from '@/lib/auth-actions'

export const metadata: Metadata = { title: 'Choose a Password' }

export default async function Reset(props: PageProps<'/reset-password'>) {
  const sp = await props.searchParams
  const token = typeof sp.token === 'string' ? sp.token : ''
  return (
    <div className="wrap section" style={{ maxWidth: 460 }}>
      <h1>Choose a password</h1>
      <Flash searchParams={props.searchParams} />
      <form action={resetPassword} className="form card">
        <input type="hidden" name="token" value={token} />
        <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <button className="btn" type="submit">Save password</button>
      </form>
    </div>
  )
}
