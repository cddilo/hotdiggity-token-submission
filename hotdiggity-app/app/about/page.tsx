import Link from 'next/link'
import type { Metadata } from 'next'
import { BUSINESS } from '@/lib/business'

export const metadata: Metadata = { title: 'About Us' }

export default function About() {
  return (
    <div className="wrap section">
      <div className="narrow">
        <div className="eyebrow">About us</div>
        <h1>A resort run by people who study dogs</h1>
        <p>
          Plenty of places will watch your dog. We wanted to build one that understands them. That's why the people
          running Hot Diggity Dog Resort hold certifications in grooming, behavior, training, and nutrition, and why
          the building is indoor, climate-controlled, and designed to stay calm.
        </p>
        <p>
          Think of it like a good hotel. You notice the clean room and the friendly desk. What you don't see is the
          staff paying attention to the small stuff all day long. Here, the small stuff is whether your dog ate
          breakfast, who they like to play with, and when they need a nap.
        </p>
      </div>
      <div className="grid two" style={{ marginTop: 30 }}>
        {BUSINESS.team.map((p) => (
          <div key={p.name} className="card">
            <h3>{p.name}</h3>
            <p className="muted" style={{ margin: 0 }}>{p.title}</p>
          </div>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 30 }}>
        <Link href="/account/book" className="btn">Book a stay</Link>
        <Link href="/contact" className="btn secondary">Schedule a tour</Link>
      </div>
    </div>
  )
}
