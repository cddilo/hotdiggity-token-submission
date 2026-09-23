import Flash from '@/components/Flash'
import { requireAdmin } from '@/lib/auth'
import { all, getSetting } from '@/lib/db'
import { requiredVaccines } from '@/lib/bookings'
import { saveSettings, saveStaff } from '@/lib/admin-actions'
import { VACCINE_KINDS } from '@/lib/business'

export default async function Settings(props: PageProps<'/admin/settings'>) {
  await requireAdmin()
  const req = requiredVaccines()
  const staff = all<{ id: number; email: string; first_name: string; role: string }>("SELECT id, email, first_name, role FROM users WHERE role != 'customer' ORDER BY role, email")
  const setup = [
    ['Online deposits (Stripe)', !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET],
    ['Email (SMTP)', !!process.env.SMTP_HOST],
    ['Text messages (Twilio)', !!process.env.TWILIO_ACCOUNT_SID],
    ['Staff alert inbox', !!process.env.STAFF_EMAIL],
  ] as const
  return (
    <div className="stack">
      <h1>Settings & staff</h1>
      <Flash searchParams={props.searchParams} />

      <section className="card">
        <h2>Connections</h2>
        <p className="muted small">These are switched on by your web host's settings (see SETUP.md). Nothing breaks while they're off; messages wait in the Messages log.</p>
        {setup.map(([label, on]) => <div key={label}><span className={`pill ${on ? 'ok' : 'warn'}`}>{on ? 'On' : 'Off'}</span> {label}</div>)}
      </section>

      <form action={saveSettings} className="form card">
        <h2>Capacity & requirements</h2>
        <div className="row">
          <div className="field"><label>Boarding: dogs per night</label><input name="boarding_capacity" type="number" min="0" defaultValue={getSetting('boarding_capacity')} /></div>
          <div className="field"><label>Daycare: dogs per day</label><input name="daycare_capacity" type="number" min="0" defaultValue={getSetting('daycare_capacity')} /></div>
          <div className="field"><label>Grooming: appointments per day</label><input name="grooming_per_day" type="number" min="0" defaultValue={getSetting('grooming_per_day')} /></div>
        </div>
        <fieldset><legend>Required vaccines</legend>
          {VACCINE_KINDS.map((k) => <label key={k} className="check"><input type="checkbox" name="required_vaccines" value={k} defaultChecked={req.includes(k)} /> {k}</label>)}
        </fieldset>
        <div><button className="btn" type="submit">Save settings</button></div>
      </form>

      <section className="card">
        <h2>Staff accounts</h2>
        <p className="muted small"><strong>Staff</strong> can run the front desk. <strong>Admin</strong> can also change prices, settings, and staff. Set a role to "customer" to remove access.</p>
        <div className="table-wrap" style={{ marginBottom: 14 }}><table>
          <tbody>{staff.map((s) => <tr key={s.id}><td>{s.first_name}</td><td>{s.email}</td><td><span className="pill">{s.role}</span></td></tr>)}</tbody>
        </table></div>
        <form action={saveStaff} className="form">
          <div className="row">
            <div className="field"><label>Email</label><input name="email" type="email" required /></div>
            <div className="field"><label>First name</label><input name="first_name" type="text" /></div>
            <div className="field"><label>Role</label><select name="role" defaultValue="staff"><option>staff</option><option>admin</option><option>customer</option></select></div>
            <div className="field"><label>Password (new accounts)</label><input name="password" type="password" minLength={8} autoComplete="new-password" /></div>
          </div>
          <div><button className="btn secondary" type="submit">Save staff member</button></div>
        </form>
      </section>
    </div>
  )
}
