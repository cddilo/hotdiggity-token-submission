import Link from 'next/link'
import Flash from '@/components/Flash'
import BookingForm from '@/components/BookingForm'
import { requireUser } from '@/lib/auth'
import { all, one, type Pet, type Service } from '@/lib/db'
import { requestBooking } from '@/lib/customer-actions'
import { vaccinesOk } from '@/lib/bookings'
import { todayISO } from '@/lib/format'

export default async function Book(props: PageProps<'/account/book'>) {
  const user = await requireUser()
  const sp = await props.searchParams
  const pets = all<Pet>('SELECT * FROM pets WHERE owner_id = ? AND active = 1 ORDER BY name', user.id)
  const services = all<Service>('SELECT * FROM services WHERE active = 1 AND bookable = 1 ORDER BY sort, id')
  const family = one<Service>("SELECT * FROM services WHERE slug = 'boarding-shared' AND active = 1")
  const today = todayISO()

  return (
    <div>
      <h1>Book a stay</h1>
      <p className="muted">Send us a request and we'll confirm, usually the same day.</p>
      <Flash searchParams={props.searchParams} />
      {pets.length === 0 ? (
        <div className="alert info">First, <Link href="/account/pets/new">add your dog</Link>. Then come back here to book.</div>
      ) : (
        <BookingForm
          services={services.map(({ id, slug, name, category, unit, price_cents, deposit_cents }) => ({ id, slug, name, category, unit, price_cents, deposit_cents }))}
          pets={pets.map((p) => ({ id: p.id, name: p.name, vaxOk: vaccinesOk(p.id, today) }))}
          initialSlug={typeof sp.service === 'string' ? sp.service : ''}
          familyRate={family ? family.price_cents : null}
          today={today}
          action={requestBooking}
        />
      )}
    </div>
  )
}
