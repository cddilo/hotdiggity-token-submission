import Flash from '@/components/Flash'
import { requireUser } from '@/lib/auth'
import { saveProfile } from '@/lib/customer-actions'

export default async function Profile(props: PageProps<'/account/profile'>) {
  const user = await requireUser()
  return (
    <div>
      <h1>My details</h1>
      <Flash searchParams={props.searchParams} />
      <form action={saveProfile} className="form card">
        <div className="row">
          <div className="field"><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" type="text" defaultValue={user.first_name} required /></div>
          <div className="field"><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" type="text" defaultValue={user.last_name} required /></div>
        </div>
        <div className="field"><label>Email</label><input type="email" value={user.email} disabled /><span className="hint">Call us to change the email on your account.</span></div>
        <div className="field"><label htmlFor="phone">Mobile phone</label><input id="phone" name="phone" type="tel" defaultValue={user.phone} required /></div>
        <div className="field"><label htmlFor="address">Home address</label><input id="address" name="address" type="text" defaultValue={user.address} /></div>
        <div className="field"><label htmlFor="emergency_contact">Emergency contact (name and phone)</label><input id="emergency_contact" name="emergency_contact" type="text" defaultValue={user.emergency_contact} /></div>
        <label className="check"><input type="checkbox" name="sms_opt_in" defaultChecked={!!user.sms_opt_in} /> Text me confirmations and reminders</label>
        <div><button className="btn" type="submit">Save</button></div>
      </form>
    </div>
  )
}
