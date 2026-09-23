import type { User } from '@/lib/db'

export default function ClientFields({ c }: { c?: User }) {
  return (
    <>
      <div className="row">
        <div className="field"><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" type="text" defaultValue={c?.first_name} required /></div>
        <div className="field"><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" type="text" defaultValue={c?.last_name} /></div>
      </div>
      <div className="row">
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" defaultValue={c?.email} required /></div>
        <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" defaultValue={c?.phone} /></div>
      </div>
      <div className="field"><label htmlFor="address">Address</label><input id="address" name="address" type="text" defaultValue={c?.address} /></div>
      <div className="field"><label htmlFor="emergency_contact">Emergency contact</label><input id="emergency_contact" name="emergency_contact" type="text" defaultValue={c?.emergency_contact} /></div>
      <label className="check"><input type="checkbox" name="sms_opt_in" defaultChecked={c ? !!c.sms_opt_in : true} /> OK to text</label>
      <div className="field"><label htmlFor="staff_notes">Staff notes (private)</label><textarea id="staff_notes" name="staff_notes" defaultValue={c?.staff_notes} /></div>
    </>
  )
}
