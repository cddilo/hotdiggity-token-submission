import { notFound } from 'next/navigation'
import Flash from '@/components/Flash'
import BookingList from '@/components/BookingList'
import ClientFields from '@/components/ClientFields'
import PetFields from '@/components/PetForm'
import { all, one, type Pet, type Service, type User, type Vaccination } from '@/lib/db'
import { BOOKING_VIEW_SQL, vaccineStatus, type BookingView } from '@/lib/bookings'
import { saveClient, staffAddVaccination, staffCreateBooking, staffSavePet, verifyVaccination } from '@/lib/admin-actions'
import { money, niceDate, todayISO } from '@/lib/format'
import { VACCINE_KINDS } from '@/lib/business'

export default async function Client(props: PageProps<'/admin/clients/[id]'>) {
  const { id } = await props.params
  const c = one<User>('SELECT * FROM users WHERE id = ?', Number(id))
  if (!c) notFound()
  const pets = all<Pet>('SELECT * FROM pets WHERE owner_id = ? ORDER BY active DESC, name', c.id)
  const bookings = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.user_id = ? ORDER BY b.start_date DESC LIMIT 100`, c.id)
  const services = all<Service>('SELECT * FROM services WHERE active = 1 ORDER BY sort, id')
  const lifetime = one<{ c: number }>('SELECT COALESCE(SUM(p.amount_cents),0) AS c FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.user_id = ?', c.id)!.c
  const today = todayISO()
  const here = `/admin/clients/${c.id}`

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{c.first_name} {c.last_name}</h1>
        <span className="muted">Lifetime paid: <strong>{money(lifetime)}</strong> · {c.password_hash ? 'Has online login' : 'No login yet'}</span>
      </div>
      <Flash searchParams={props.searchParams} />

      <section className="card">
        <h2>New booking for {c.first_name}</h2>
        {pets.length === 0 ? <p className="muted">Add a dog below first.</p> : (
          <form action={staffCreateBooking} className="form">
            <input type="hidden" name="user_id" value={c.id} />
            <div className="row">
              <div className="field"><label htmlFor="service_id">Service</label>
                <select id="service_id" name="service_id">{services.map((s) => <option key={s.id} value={s.id}>{s.name} ({money(s.price_cents)}/{s.unit})</option>)}</select>
              </div>
              <div className="field"><label htmlFor="b_start">Start</label><input id="b_start" name="start_date" type="date" required /></div>
              <div className="field"><label htmlFor="b_end">End (boarding/daycare)</label><input id="b_end" name="end_date" type="date" /></div>
            </div>
            <div className="row">
              <div className="field"><label htmlFor="b_drop">Drop-off time</label><input id="b_drop" name="dropoff_time" type="time" /></div>
              <div className="field"><label htmlFor="b_pick">Pickup time</label><input id="b_pick" name="pickup_time" type="time" /></div>
            </div>
            <fieldset><legend>Dogs</legend>
              {pets.filter((p) => p.active).map((p) => <label key={p.id} className="check"><input type="checkbox" name="pet_ids" value={p.id} defaultChecked={pets.length === 1} /> {p.name}</label>)}
            </fieldset>
            <div className="field"><label htmlFor="b_notes">Staff notes</label><input id="b_notes" name="staff_notes" type="text" /></div>
            <label className="check"><input type="checkbox" name="confirm" defaultChecked /> Mark confirmed right away</label>
            <div><button className="btn" type="submit">Create booking</button></div>
          </form>
        )}
      </section>

      <section>
        <h2>Dogs</h2>
        <div className="stack">
          {pets.map((p) => {
            const vax = all<Vaccination>('SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY kind, expires_on DESC', p.id)
            const status = vaccineStatus(p.id, today)
            return (
              <details key={p.id} className="card" open={pets.length === 1}>
                <summary style={{ cursor: 'pointer' }}>
                  <strong style={{ fontSize: '1.15rem' }}>{p.name}</strong> <span className="muted">{p.breed}</span>{' '}
                  {status.map((v) => <span key={v.kind} className={`pill ${!v.ok ? 'bad' : v.verified ? 'ok' : 'warn'}`} style={{ marginLeft: 4 }}>{v.kind}</span>)}
                  {!p.temperament_ok && <span className="pill warn" style={{ marginLeft: 4 }}>Temperament check</span>}
                </summary>
                <div className="stack" style={{ marginTop: 14 }}>
                  <div className="table-wrap"><table>
                    <thead><tr><th>Vaccine</th><th>Expires</th><th>Record</th><th></th></tr></thead>
                    <tbody>
                      {vax.map((v) => (
                        <tr key={v.id}>
                          <td>{v.kind}</td>
                          <td><span className={`pill ${v.expires_on < today ? 'bad' : v.verified ? 'ok' : 'warn'}`}>{niceDate(v.expires_on)}</span></td>
                          <td>{v.file_name ? <a href={`/files/${v.file_name}`} target="_blank">View</a> : '—'}</td>
                          <td>{!v.verified && (
                            <form action={verifyVaccination}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="verdict" value="ok" /><input type="hidden" name="return_to" value={here} /><button className="btn ok small">Verify</button></form>
                          )}</td>
                        </tr>
                      ))}
                      {vax.length === 0 && <tr><td colSpan={4} className="muted">No records yet.</td></tr>}
                    </tbody>
                  </table></div>
                  <form action={staffAddVaccination} className="filters">
                    <input type="hidden" name="pet_id" value={p.id} />
                    <div className="field"><label>Vaccine</label><select name="kind">{VACCINE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
                    <div className="field"><label>Expires</label><input name="expires_on" type="date" required /></div>
                    <div className="field"><label>File (optional)</label><input name="file" type="file" accept="image/*,application/pdf" /></div>
                    <button className="btn small" type="submit">Add verified record</button>
                  </form>
                  <form action={staffSavePet} className="form">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="owner_id" value={c.id} />
                    <PetFields pet={p} />
                    <label className="check"><input type="checkbox" name="temperament_ok" defaultChecked={!!p.temperament_ok} /> Passed temperament check</label>
                    <div className="field"><label>Staff notes (private)</label><textarea name="staff_notes" defaultValue={p.staff_notes} /></div>
                    <div><button className="btn secondary" type="submit">Save {p.name}</button></div>
                  </form>
                </div>
              </details>
            )
          })}
          <details className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>+ Add a dog</summary>
            <form action={staffSavePet} className="form" style={{ marginTop: 14 }}>
              <input type="hidden" name="owner_id" value={c.id} />
              <PetFields />
              <label className="check"><input type="checkbox" name="temperament_ok" /> Passed temperament check</label>
              <div className="field"><label>Staff notes (private)</label><textarea name="staff_notes" /></div>
              <div><button className="btn" type="submit">Add dog</button></div>
            </form>
          </details>
        </div>
      </section>

      <section><h2>Bookings</h2><BookingList rows={bookings} empty="No bookings yet." /></section>

      <section>
        <h2>Contact details</h2>
        <form action={saveClient} className="form card">
          <input type="hidden" name="id" value={c.id} />
          <ClientFields c={c} />
          <div><button className="btn secondary" type="submit">Save client</button></div>
        </form>
      </section>
    </div>
  )
}
