import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { BUSINESS, fullAddress } from '@/lib/business'
import { currentUser } from '@/lib/auth'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: {
    default: `${BUSINESS.name} | Dog Boarding, Daycare & Grooming in Escondido, CA`,
    template: `%s | ${BUSINESS.name}`,
  },
  description:
    'Dog boarding, daycare, grooming, training and anesthesia-free teeth cleaning in Escondido, CA. Private climate-controlled suites and 24/7 webcams.',
}

// Tells Google who and where we are, which helps "dog boarding near me" searches.
const localBusiness = {
  '@context': 'https://schema.org',
  '@type': 'PetStore',
  additionalType: 'https://schema.org/LocalBusiness',
  name: BUSINESS.name,
  telephone: BUSINESS.phone,
  email: BUSINESS.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS.street,
    addressLocality: BUSINESS.city,
    addressRegion: BUSINESS.state,
    postalCode: BUSINESS.zip,
    addressCountry: 'US',
  },
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: BUSINESS.open,
    closes: BUSINESS.close,
  }],
  sameAs: [BUSINESS.instagram, BUSINESS.yelp],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  const isStaff = user?.role === 'staff' || user?.role === 'admin'
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700;800&display=swap"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      </head>
      <body>
        <div className="topbar">
          <div className="wrap">
            <span>📍 {fullAddress}</span>
            <span>
              Mon–Sat 6:30am–6pm · <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
            </span>
          </div>
        </div>
        <header className="header">
          <div className="wrap">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden>🐾</span>
              <span className="logo-text">
                Hot Diggity Dog Resort
                <small>Escondido, California</small>
              </span>
            </Link>
            <nav className="nav">
              <Link href="/services">Services & Rates</Link>
              <Link href="/webcams">Webcams</Link>
              <Link href="/about">About</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/contact">Contact</Link>
              {isStaff && <Link href="/admin">Front Desk</Link>}
              {user ? <Link href="/account">My Account</Link> : <Link href="/login">Log In</Link>}
              <Link href="/account/book" className="btn small">Book Now</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap grid">
            <div>
              <h3>{BUSINESS.name}</h3>
              <p>
                {BUSINESS.street}<br />
                {BUSINESS.city}, {BUSINESS.state} {BUSINESS.zip}<br />
                <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a><br />
                <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
              </p>
            </div>
            <div>
              <h3>Hours</h3>
              {BUSINESS.hours.map(([d, h]) => (
                <div key={d}>{d}: {h}</div>
              ))}
            </div>
            <div>
              <h3>Explore</h3>
              <div><Link href="/services">Services & Rates</Link></div>
              <div><Link href="/policies">Policies & Vaccines</Link></div>
              <div><Link href="/faq">FAQ</Link></div>
              <div><a href={BUSINESS.instagram}>Instagram</a> · <a href={BUSINESS.yelp}>Yelp</a></div>
            </div>
          </div>
          <div className="wrap small muted" style={{ marginTop: 24, color: '#b9aa94' }}>
            © {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  )
}
