import Link from 'next/link'
import type { Metadata } from 'next'
import { all, type Service } from '@/lib/db'
import { money, UNIT_LABEL } from '@/lib/format'

export const metadata: Metadata = { title: 'Services & Rates' }
export const dynamic = 'force-dynamic'

const SECTIONS: { key: Service['category']; title: string; intro: string }[] = [
  { key: 'boarding', title: 'Overnight Boarding', intro: 'Private, climate-controlled suites, daily play and rest time, and a staff that notices when something is off. Checkout day is not charged as a night.' },
  { key: 'daycare', title: 'Daycare', intro: 'Drop off on your way to work, pick up a tired dog on your way home. Dogs are grouped by size and play style.' },
  { key: 'grooming', title: 'Grooming', intro: 'Every groom is done by someone who understands dog behavior, so nervous dogs get patience, not pressure.' },
  { key: 'training', title: 'Training & Enrichment', intro: 'L.E.E.P. is our structured enrichment program. A tired mind makes for a calmer dog than a tired body alone.' },
  { key: 'wellness', title: 'Wellness', intro: 'Handle the routine health stuff while your dog is already here.' },
]

export default function ServicesPage() {
  const services = all<Service>('SELECT * FROM services WHERE active = 1 ORDER BY sort, id')
  return (
    <div className="wrap section">
      <div className="eyebrow">Services & rates</div>
      <h1>What we offer</h1>
      <p className="muted" style={{ maxWidth: 640 }}>
        Prices are per dog unless noted. Every dog needs current Rabies, DHPP, and Bordetella shots on file before
        their first visit. <Link href="/policies">See all policies</Link>.
      </p>
      {SECTIONS.map((sec) => {
        const list = services.filter((s) => s.category === sec.key)
        if (!list.length) return null
        return (
          <section key={sec.key} id={sec.key} style={{ marginTop: 40, scrollMarginTop: 100 }}>
            <h2>{sec.title}</h2>
            <p className="muted" style={{ maxWidth: 700 }}>{sec.intro}</p>
            <div className="grid two">
              {list.map((s) => (
                <div key={s.id} className="card">
                  <h3>{s.name}</h3>
                  <p className="muted">{s.description}</p>
                  <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                    <span className="price">{s.price_cents > 0 ? `${money(s.price_cents)} ${UNIT_LABEL[s.unit]}` : 'Call for pricing'}</span>
                    {s.bookable ? <Link href={`/account/book?service=${s.slug}`} className="btn small">Book</Link> : null}
                  </div>
                  {s.deposit_cents > 0 && <p className="small muted" style={{ margin: '8px 0 0' }}>{money(s.deposit_cents)} deposit holds your reservation.</p>}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
