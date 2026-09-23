import Link from 'next/link'
import type { Metadata } from 'next'
import { BUSINESS } from '@/lib/business'

export const metadata: Metadata = { title: 'Webcams: Watch Your Dog 24/7' }

export default function Webcams() {
  return (
    <div className="wrap section narrow">
      <div className="eyebrow">24/7 webcams</div>
      <h1>See how they're doing, any time</h1>
      <p>
        Our cameras run around the clock, so you can check in from the office, the airport, or the beach. Most dogs are
        having a better day than their owners.
      </p>
      {BUSINESS.webcamUrl ? (
        <a href={BUSINESS.webcamUrl} className="btn" target="_blank" rel="noopener">Open the live webcams</a>
      ) : (
        <div className="alert info">
          Webcam access is available to current guests. Ask the front desk for your viewing link at drop-off, or
          call <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
        </div>
      )}
      <p className="muted small" style={{ marginTop: 20 }}>
        Not a guest yet? <Link href="/account/book">Book a stay</Link> and you'll get access too.
      </p>
    </div>
  )
}
