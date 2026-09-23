import type { Metadata } from 'next'
import Flash from '@/components/Flash'
import { requestReset } from '@/lib/auth-actions'

export const metadata: Metadata = { title: 'Set or Reset Your Password' }

export default function Forgot(props: PageProps<'/forgot-password'>) {
  return (
    <div className="wrap section" style={{ maxWidth: 460 }}>
      <h1>Set or reset your password</h1>
      <p className="muted">Enter the email we have on file. We'll send a link to set a new password.</p>
      <Flash searchParams={props.searchParams} />
      <form action={requestReset} className="form card">
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
        <button className="btn" type="submit">Send me a link</button>
      </form>
    </div>
  )
}
