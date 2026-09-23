'use client'
import { useMemo, useState } from 'react'

type Svc = { id: number; slug: string; name: string; category: string; unit: string; price_cents: number; deposit_cents: number }
type PetOpt = { id: number; name: string; vaxOk: boolean }

const fmt = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const nights = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

// The booking form, with a running estimate so there are no surprises.
// The server re-checks everything (dates, capacity, shots) and computes the real price.
export default function BookingForm({
  services, pets, initialSlug, familyRate, today, action,
}: {
  services: Svc[]; pets: PetOpt[]; initialSlug: string; familyRate: number | null; today: string
  action: (fd: FormData) => void
}) {
  const [serviceId, setServiceId] = useState(services.find((s) => s.slug === initialSlug)?.id ?? services[0]?.id)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [chosen, setChosen] = useState<number[]>(pets.length === 1 ? [pets[0].id] : [])
  const svc = services.find((s) => s.id === serviceId)
  const multi = svc?.unit === 'night' || svc?.unit === 'day'

  const estimate = useMemo(() => {
    if (!svc || !start || !chosen.length) return null
    let units = 1
    if (svc.unit === 'night') { if (!end) return null; units = nights(start, end); if (units < 1) return null }
    if (svc.unit === 'day') {
      const last = end || start
      units = 0
      for (let d = new Date(start + 'T12:00:00Z'); d <= new Date(last + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) if (d.getUTCDay() !== 0) units++
      if (!units) return null
    }
    const extra = svc.category === 'boarding' && familyRate !== null ? familyRate : svc.price_cents
    const total = svc.price_cents * units + extra * units * (chosen.length - 1)
    return { units, total, deposit: Math.min(svc.deposit_cents, total) }
  }, [svc, start, end, chosen, familyRate])

  const toggle = (id: number) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  return (
    <form action={action} className="form card">
      <div className="field">
        <label htmlFor="service_id">What would you like to book?</label>
        <select id="service_id" name="service_id" value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}: {fmt(s.price_cents)} / {s.unit}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend>Which dogs?</legend>
        {pets.map((p) => (
          <label key={p.id} className="check">
            <input type="checkbox" name="pet_ids" value={p.id} checked={chosen.includes(p.id)} onChange={() => toggle(p.id)} />
            {p.name} {!p.vaxOk && <span className="pill warn">shot records needed</span>}
          </label>
        ))}
      </fieldset>

      <div className="row">
        <div className="field">
          <label htmlFor="start_date">{multi ? (svc?.unit === 'night' ? 'Drop-off date' : 'First day') : 'Date'}</label>
          <input id="start_date" name="start_date" type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        {multi && (
          <div className="field">
            <label htmlFor="end_date">{svc?.unit === 'night' ? 'Pickup date' : 'Last day (optional)'}</label>
            <input id="end_date" name="end_date" type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} required={svc?.unit === 'night'} />
          </div>
        )}
      </div>
      <div className="row">
        <div className="field"><label htmlFor="dropoff_time">{multi ? 'Drop-off time' : 'Preferred time'}</label><input id="dropoff_time" name="dropoff_time" type="time" min="06:30" max="18:00" /></div>
        {multi && <div className="field"><label htmlFor="pickup_time">Pickup time</label><input id="pickup_time" name="pickup_time" type="time" min="06:30" max="18:00" /></div>}
      </div>
      <p className="hint" style={{ margin: 0 }}>We're open Monday–Saturday, 6:30 am – 6:00 pm. Closed Sundays.</p>

      <div className="field"><label htmlFor="notes">Anything else?</label><textarea id="notes" name="notes" placeholder="Add-ons like a bath before pickup, special requests…" /></div>

      {estimate && (
        <div className="alert info" aria-live="polite">
          Estimate: <strong>{fmt(estimate.total)}</strong>
          {svc?.unit !== 'visit' && <> for {estimate.units} {svc?.unit}{estimate.units === 1 ? '' : 's'}</>}
          {estimate.deposit > 0 && <> · {fmt(estimate.deposit)} deposit once confirmed</>}
        </div>
      )}
      <div><button className="btn" type="submit">Send request</button></div>
    </form>
  )
}
