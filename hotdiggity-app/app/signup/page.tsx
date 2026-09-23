import Link from 'next/link'
import type { Metadata } from 'next'
import Flash from '@/components/Flash'
import { signup } from '@/lib/auth-actions'

export const metadata: Metadata = { title: 'Create an Account' }

export default function Signup(props: PageProps<'/signup'>) {
  return (
    <div className="wrap section" style={{ maxWidth: 560 }}>
      <h1>Create your account</h1>
      <p className="muted">You'll add your dog and their shot records next. It takes about two minutes.</p>
      <Flash searchParams={props.searchParams} />
      <form action={signup} className="form card">
        <div className="row">
          <div className="field"><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" type="text" autoComplete="given-name" required /></div>
          <div className="field"><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" type="text" autoComplete="family-name" required /></div>
        </div>
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
        <div className="field"><label htmlFor="phone">Mobile phone</label><input id="phone" name="phone" type="tel" autoComplete="tel" required /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /><span className="hint">At least 8 characters.</span></div>
        <label className="check"><input type="checkbox" name="sms_opt_in" defaultChecked /> Text me booking confirmations and reminders. Message and data rates may apply. Reply STOP to opt out.</label>
        <button className="btn" type="submit">Create account</button>
      </form>
      <p className="center" style={{ marginTop: 18 }}>Already have an account? <Link href="/login">Log in</Link></p>
    </div>
  )
}
