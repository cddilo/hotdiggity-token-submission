import { notFound } from 'next/navigation'
import Link from 'next/link'
import Flash from '@/components/Flash'
import PetFields from '@/components/PetForm'
import { requireUser } from '@/lib/auth'
import { all, one, type Pet, type Vaccination } from '@/lib/db'
import { addVaccination, savePet } from '@/lib/customer-actions'
import { requiredVaccines } from '@/lib/bookings'
import { niceDate, todayISO } from '@/lib/format'
import { VACCINE_KINDS } from '@/lib/business'

export default async function PetPage(props: PageProps<'/account/pets/[id]'>) {
  const user = await requireUser()
  const { id } = await props.params
  const pet = one<Pet>('SELECT * FROM pets WHERE id = ? AND owner_id = ?', Number(id), user.id)
  if (!pet) notFound()
  const vax = all<Vaccination>('SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY kind, expires_on DESC', pet.id)
  const required = requiredVaccines()
  const today = todayISO()
  const missing = required.filter((k) => !vax.some((v) => v.kind === k && v.expires_on >= today))

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{pet.name}</h1>
        <Link href={`/account/book`} className="btn">Book for {pet.name}</Link>
      </div>
      <Flash searchParams={props.searchParams} />

      <section className="card">
        <h2>Shot records</h2>
        {missing.length > 0 ? (
          <div className="alert info">Still needed: <strong>{missing.join(', ')}</strong>. Snap a photo of the paperwork from your vet and upload it here.</div>
        ) : (
          <div className="alert success">All required shots are on file. 🎉</div>
        )}
        {vax.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead><tr><th>Vaccine</th><th>Expires</th><th>Status</th><th>Record</th></tr></thead>
              <tbody>
                {vax.map((v) => (
                  <tr key={v.id}>
                    <td>{v.kind}</td>
                    <td>{niceDate(v.expires_on)}</td>
                    <td>
                      {v.expires_on < today ? <span className="pill bad">Expired</span>
                        : v.verified ? <span className="pill ok">Verified</span>
                        : <span className="pill warn">Checking</span>}
                    </td>
                    <td>{v.file_name ? <a href={`/files/${v.file_name}`} target="_blank">View</a> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={addVaccination} className="form">
          <input type="hidden" name="pet_id" value={pet.id} />
          <div className="row">
            <div className="field">
              <label htmlFor="kind">Vaccine</label>
              <select id="kind" name="kind" required defaultValue={missing[0] ?? ''}>
                <option value="" disabled>Choose…</option>
                {VACCINE_KINDS.map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="expires_on">Expires on</label><input id="expires_on" name="expires_on" type="date" required /></div>
          </div>
          <div className="field">
            <label htmlFor="file">Photo or PDF of the record</label>
            <input id="file" name="file" type="file" accept="image/*,application/pdf" required />
          </div>
          <div><button className="btn" type="submit">Upload record</button></div>
        </form>
      </section>

      <section>
        <h2>About {pet.name}</h2>
        <form action={savePet} className="form card">
          <input type="hidden" name="id" value={pet.id} />
          <PetFields pet={pet} />
          <div><button className="btn" type="submit">Save changes</button></div>
        </form>
      </section>
    </div>
  )
}
