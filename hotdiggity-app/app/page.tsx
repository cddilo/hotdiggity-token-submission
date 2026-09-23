import Link from 'next/link'
import { BUSINESS } from '@/lib/business'

const SERVICES = [
  { icon: '🛏️', title: 'Overnight Boarding', text: 'Private, climate-controlled suites. Your dog sleeps in their own space and spends the day playing, resting, and getting attention.', href: '/services#boarding' },
  { icon: '🎾', title: 'Daycare', text: 'A full day of supervised play and rest. They go home tired and happy. You go home to a calm dog.', href: '/services#daycare' },
  { icon: '✂️', title: 'Grooming', text: 'Baths, haircuts, and nail trims by a Master Groomer who also happens to be a certified animal behaviorist.', href: '/services#grooming' },
  { icon: '🧠', title: 'Training & L.E.E.P.', text: 'Our enrichment program keeps minds busy, not just legs. Add it to any stay, or book private training.', href: '/services#training' },
  { icon: '🦷', title: 'Teeth Cleaning', text: 'Anesthesia-free cleaning and on-site vaccinations, so you skip a separate trip to the vet.', href: '/services#wellness' },
  { icon: '📹', title: '24/7 Webcams', text: 'Check in from your phone anytime. Most of our owners admit they watch more than they planned to.', href: '/webcams' },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Dog boarding · daycare · grooming · Escondido, CA</div>
            <h1>They'll miss you. They just won't have time to show it.</h1>
            <p className="lede">
              Hot Diggity Dog Resort is an indoor, climate-controlled home base for your dog while you're at work
              or out of town. Real people who know dogs, a clean and calm building, and cameras so you can see for yourself.
            </p>
            <div className="btn-row">
              <Link href="/account/book" className="btn">Book a stay</Link>
              <a href={BUSINESS.phoneHref} className="btn secondary">Call {BUSINESS.phone}</a>
            </div>
          </div>
          <div className="hero-card">
            <h3>New here? Three steps.</h3>
            <ol>
              <li><Link href="/signup">Create your account</Link> (two minutes).</li>
              <li>Add your dog and upload shot records: Rabies, DHPP, and Bordetella.</li>
              <li>Pick your dates. We confirm by email or text, usually the same day.</li>
            </ol>
            <p className="small muted">Already a client from our old system? Use "Forgot password" on the login page with the email we have on file.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">What we do</div>
          <h2>Everything your dog needs under one roof</h2>
          <div className="grid three" style={{ marginTop: 20 }}>
            {SERVICES.map((s) => (
              <Link key={s.title} href={s.href} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="icon" aria-hidden>{s.icon}</div>
                <h3>{s.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{s.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap grid two" style={{ alignItems: 'center' }}>
          <div>
            <div className="eyebrow">Who's watching your dog</div>
            <h2>Certified people, not just dog lovers</h2>
            <p>
              Loving dogs is the easy part. Reading them is the skill. Penny DiLoreto is a Master Groomer, Certified
              Animal Behaviorist, and Professional Dog Trainer. David DiLoreto is a Certified Pet Nutritionist. That
              background shapes everything here, from how playgroups are matched to what goes in the bowl.
            </p>
            <p>
              Our Pet Wellness Concierge is also on call around the clock for health and nutrition questions.
            </p>
            <Link href="/about" className="btn secondary">Meet the team</Link>
          </div>
          <div className="card">
            <h3>Why owners pick us</h3>
            <ul>
              <li>Indoor and climate-controlled. No Escondido summer heat, no winter chill.</li>
              <li>Individual suites for boarding, never a row of chain-link runs.</li>
              <li>24/7 live webcams.</li>
              <li>Grooming, training, teeth cleaning, and vaccinations on site.</li>
              <li>Open six days a week, 6:30 am to 6 pm.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section center">
        <div className="wrap narrow">
          <h2>Ready when you are</h2>
          <p className="muted">Holidays fill up fast. If you know your dates, grab them now.</p>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link href="/account/book" className="btn">Book now</Link>
            <Link href="/contact" className="btn secondary">Ask a question</Link>
          </div>
        </div>
      </section>
    </>
  )
}
