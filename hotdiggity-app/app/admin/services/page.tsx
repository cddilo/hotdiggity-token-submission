import Flash from '@/components/Flash'
import { requireAdmin } from '@/lib/auth'
import { all, getSetting, type Service } from '@/lib/db'
import { markPricesReviewed, saveService } from '@/lib/admin-actions'

function ServiceForm({ s }: { s?: Service }) {
  return (
    <form action={saveService} className="form card">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="row">
        <div className="field" style={{ gridColumn: 'span 2' }}><label>Name</label><input name="name" type="text" defaultValue={s?.name} required /></div>
        <div className="field"><label>Category</label>
          <select name="category" defaultValue={s?.category ?? 'boarding'}>
            <option value="boarding">Boarding</option><option value="daycare">Daycare</option><option value="grooming">Grooming</option>
            <option value="training">Training</option><option value="wellness">Wellness</option>
          </select>
        </div>
      </div>
      <div className="row">
        <div className="field"><label>Price ($)</label><input name="price" type="text" inputMode="decimal" defaultValue={s ? (s.price_cents / 100).toFixed(2) : ''} /></div>
        <div className="field"><label>Charged</label>
          <select name="unit" defaultValue={s?.unit ?? 'visit'}>
            <option value="night">per night</option><option value="day">per day</option><option value="visit">per visit</option><option value="package">per package</option>
          </select>
        </div>
        <div className="field"><label>Deposit ($)</label><input name="deposit" type="text" inputMode="decimal" defaultValue={s ? (s.deposit_cents / 100).toFixed(2) : '0'} /></div>
        <div className="field"><label>Sort order</label><input name="sort" type="number" defaultValue={s?.sort ?? 99} /></div>
      </div>
      <div className="field"><label>Description (shown on the website)</label><textarea name="description" defaultValue={s?.description} /></div>
      <div className="btn-row">
        <label className="check"><input type="checkbox" name="active" defaultChecked={s ? !!s.active : true} /> Show on website</label>
        <label className="check"><input type="checkbox" name="bookable" defaultChecked={s ? !!s.bookable : true} /> Clients can book online</label>
        <button className="btn small" type="submit">{s ? 'Save' : 'Add service'}</button>
      </div>
    </form>
  )
}

export default async function Services(props: PageProps<'/admin/services'>) {
  await requireAdmin()
  const services = all<Service>('SELECT * FROM services ORDER BY sort, id')
  const reviewed = getSetting('prices_reviewed') === '1'
  return (
    <div className="stack">
      <h1>Services & prices</h1>
      <Flash searchParams={props.searchParams} />
      {!reviewed && (
        <div className="alert info">
          These are <strong>starter prices</strong>. Please replace them with your real rates, then click below.
          <form action={markPricesReviewed} style={{ marginTop: 8 }}><button className="btn small">I've reviewed my prices</button></form>
        </div>
      )}
      <p className="muted small">"Family Suite (2nd dog)" is the rate used for each extra dog sharing a boarding suite. Changing a price doesn't change bookings already made.</p>
      {services.map((s) => <ServiceForm key={s.id} s={s} />)}
      <h2>Add a service</h2>
      <ServiceForm />
    </div>
  )
}
