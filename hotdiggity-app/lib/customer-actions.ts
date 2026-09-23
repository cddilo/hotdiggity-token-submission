'use server'
import { redirect } from 'next/navigation'
import { requireUser } from './auth'
import { one, run, tx, type Booking, type Pet, type Service } from './db'
import { back } from './flash'
import { isISODate, niceDate, str, todayISO, weekday, money } from './format'
import { fullDates, quote, vaccinesOk } from './bookings'
import { notifyStaff, sendEmail, siteUrl } from './notify'
import { checkoutUrl, stripeEnabled } from './payments'
import { BUSINESS, VACCINE_KINDS } from './business'
import { storeUpload } from './uploads'

function ownPet(petId: number, userId: number): Pet {
  const pet = one<Pet>('SELECT * FROM pets WHERE id = ? AND owner_id = ?', petId, userId)
  if (!pet) back('/account', 'error', "We couldn't find that pet.")
  return pet
}

function petFields(formData: FormData) {
  const weight = Number(formData.get('weight_lbs'))
  return {
    name: str(formData.get('name'), 80),
    breed: str(formData.get('breed'), 120),
    sex: str(formData.get('sex'), 20),
    birthdate: isISODate(str(formData.get('birthdate'))) ? str(formData.get('birthdate')) : '',
    weight_lbs: Number.isFinite(weight) && weight > 0 ? weight : null,
    color: str(formData.get('color'), 80),
    fixed: formData.get('fixed') ? 1 : 0,
    feeding: str(formData.get('feeding')),
    medications: str(formData.get('medications')),
    allergies: str(formData.get('allergies')),
    behavior: str(formData.get('behavior')),
    vet_name: str(formData.get('vet_name'), 120),
    vet_phone: str(formData.get('vet_phone'), 40),
  }
}

export async function savePet(formData: FormData) {
  const user = await requireUser()
  const id = Number(formData.get('id')) || 0
  const f = petFields(formData)
  if (!f.name) back(id ? `/account/pets/${id}` : '/account/pets/new', 'error', "Please enter your dog's name.")
  if (id) {
    ownPet(id, user.id)
    run(`UPDATE pets SET name=?, breed=?, sex=?, birthdate=?, weight_lbs=?, color=?, fixed=?, feeding=?, medications=?,
         allergies=?, behavior=?, vet_name=?, vet_phone=? WHERE id = ? AND owner_id = ?`,
      f.name, f.breed, f.sex, f.birthdate, f.weight_lbs, f.color, f.fixed, f.feeding, f.medications,
      f.allergies, f.behavior, f.vet_name, f.vet_phone, id, user.id)
    back(`/account/pets/${id}`, 'success', 'Saved.')
  }
  const { id: newId } = run(
    `INSERT INTO pets (owner_id, name, breed, sex, birthdate, weight_lbs, color, fixed, feeding, medications, allergies, behavior, vet_name, vet_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id, f.name, f.breed, f.sex, f.birthdate, f.weight_lbs, f.color, f.fixed, f.feeding, f.medications,
    f.allergies, f.behavior, f.vet_name, f.vet_phone)
  back(`/account/pets/${newId}`, 'success', `${f.name} is added. Next, upload their shot records below.`)
}

export async function addVaccination(formData: FormData) {
  const user = await requireUser()
  const petId = Number(formData.get('pet_id'))
  const pet = ownPet(petId, user.id)
  const here = `/account/pets/${petId}`
  const kind = str(formData.get('kind'))
  const expires = str(formData.get('expires_on'))
  if (!(VACCINE_KINDS as readonly string[]).includes(kind)) back(here, 'error', 'Please choose which vaccine this is.')
  if (!isISODate(expires)) back(here, 'error', 'Please enter the expiration date from the record.')
  if (expires < todayISO()) back(here, 'error', 'That date has already passed. Your dog will need a booster before their visit.')
  const fileName = await storeUpload(formData.get('file'), here)
  if (!fileName) back(here, 'error', 'Please attach a photo or PDF of the record so we can verify it.')
  run('INSERT INTO vaccinations (pet_id, kind, expires_on, file_name) VALUES (?, ?, ?, ?)', petId, kind, expires, fileName)
  await notifyStaff(`New ${kind} record for ${pet.name}`, `${user.first_name} ${user.last_name} uploaded a ${kind} record for ${pet.name}, expiring ${niceDate(expires)}. Verify it: ${siteUrl('/admin/vaccines')}`)
  back(here, 'success', `${kind} record uploaded. We'll verify it shortly.`)
}

export async function saveProfile(formData: FormData) {
  const user = await requireUser()
  const first = str(formData.get('first_name'), 80)
  const last = str(formData.get('last_name'), 80)
  const phone = str(formData.get('phone'), 40)
  if (!first || !last || !phone) back('/account/profile', 'error', 'Name and phone are required.')
  run('UPDATE users SET first_name=?, last_name=?, phone=?, address=?, emergency_contact=?, sms_opt_in=? WHERE id = ?',
    first, last, phone, str(formData.get('address'), 300), str(formData.get('emergency_contact'), 300),
    formData.get('sms_opt_in') ? 1 : 0, user.id)
  back('/account/profile', 'success', 'Saved.')
}

function withinHours(t: string): boolean {
  return !t || (t >= BUSINESS.open && t <= BUSINESS.close)
}

export async function requestBooking(formData: FormData) {
  const user = await requireUser()
  const serviceId = Number(formData.get('service_id'))
  const service = one<Service>('SELECT * FROM services WHERE id = ? AND active = 1 AND bookable = 1', serviceId)
  const retry = '/account/book' + (service ? `?service=${service.slug}` : '')
  if (!service) back('/account/book', 'error', 'Please choose a service.')

  const start = str(formData.get('start_date'))
  const multiDay = service.unit === 'night' || service.unit === 'day'
  const end = multiDay ? str(formData.get('end_date')) || start : start
  const dropoff = str(formData.get('dropoff_time'), 5)
  const pickup = str(formData.get('pickup_time'), 5)
  const petIds = formData.getAll('pet_ids').map(Number).filter(Boolean)

  if (!isISODate(start) || !isISODate(end)) back(retry, 'error', 'Please pick your dates.')
  if (start < todayISO()) back(retry, 'error', "That date is in the past.")
  if (service.unit === 'night' && end <= start) back(retry, 'error', 'Pickup has to be at least one night after drop-off.')
  if (end < start) back(retry, 'error', 'The end date is before the start date.')
  if (BUSINESS.closedWeekdays.includes(weekday(start))) back(retry, 'error', "We're closed Sundays. Please pick another drop-off day.")
  if (BUSINESS.closedWeekdays.includes(weekday(end))) back(retry, 'error', "We're closed Sundays. Please pick another pickup day.")
  if (!withinHours(dropoff) || !withinHours(pickup)) back(retry, 'error', 'Drop-off and pickup need to be between 6:30 am and 6:00 pm.')
  if (!petIds.length) back(retry, 'error', 'Please choose which dog is coming.')

  const pets = petIds.map((id) => ownPet(id, user.id))
  const missing = pets.filter((p) => !vaccinesOk(p.id, end))
  if (missing.length) {
    back(`/account/pets/${missing[0].id}`, 'error',
      `${missing.map((p) => p.name).join(' and ')} need${missing.length === 1 ? 's' : ''} current shot records on file through ${niceDate(end)} before we can book. Upload them below.`)
  }

  const full = fullDates(service, start, end, pets.length)
  if (full.length) {
    back(retry, 'error', `Sorry, we're full on ${full.slice(0, 3).map(niceDate).join(', ')}${full.length > 3 ? ' and more' : ''}. Call us at ${BUSINESS.phone} and we'll add you to the waitlist.`)
  }

  const q = quote(service, start, end, pets.length)
  const bookingId = tx(() => {
    const { id } = run(
      `INSERT INTO bookings (user_id, service_id, start_date, end_date, dropoff_time, pickup_time, customer_notes, total_cents, deposit_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      user.id, service.id, start, end, dropoff, pickup, str(formData.get('notes')), q.total_cents, q.deposit_cents)
    for (const p of pets) run('INSERT INTO booking_pets (booking_id, pet_id) VALUES (?, ?)', id, p.id)
    return id
  })

  const names = pets.map((p) => p.name).join(' & ')
  const when = start === end ? niceDate(start) : `${niceDate(start)} – ${niceDate(end)}`
  await notifyStaff(`New request: ${service.name} for ${names}`,
    `${user.first_name} ${user.last_name} (${user.phone}) requested ${service.name} for ${names}, ${when}.\nEstimate: ${money(q.total_cents)}\n\nReview it: ${siteUrl('/admin/bookings/' + bookingId)}`)
  await sendEmail(user.email, `We got your request for ${names}`,
    `Hi ${user.first_name},\n\nThanks for your request: ${service.name} for ${names}, ${when}.\nEstimated total: ${money(q.total_cents)}\n\nThis isn't confirmed yet. We'll review it and get back to you, usually the same day.\n\nView it any time: ${siteUrl('/account/bookings/' + bookingId)}\n\n${BUSINESS.name}\n${BUSINESS.phone}`)
  redirect(`/account/bookings/${bookingId}?success=` + encodeURIComponent("Request sent! We'll confirm by email or text."))
}

export async function cancelBooking(formData: FormData) {
  const user = await requireUser()
  const id = Number(formData.get('id'))
  const b = one<Booking>('SELECT * FROM bookings WHERE id = ? AND user_id = ?', id, user.id)
  if (!b || !['requested', 'confirmed'].includes(b.status)) back('/account', 'error', "That booking can't be cancelled online. Please call us.")
  run("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", id)
  await notifyStaff(`Cancelled by client: booking #${id}`, `${user.first_name} ${user.last_name} cancelled booking #${id} (${niceDate(b.start_date)}). ${b.paid_cents ? `They had paid ${money(b.paid_cents)}; review for refund.` : ''}\n${siteUrl('/admin/bookings/' + id)}`)
  back(`/account/bookings/${id}`, 'success', 'Your booking is cancelled.')
}

export async function payDeposit(formData: FormData) {
  const user = await requireUser()
  const id = Number(formData.get('id'))
  const b = one<Booking & { service_name: string }>(
    'SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.id = ? AND b.user_id = ?', id, user.id)
  if (!b || !stripeEnabled()) back('/account', 'error', 'Online payment is not available right now.')
  const owed = Math.max(0, b.deposit_cents - b.paid_cents)
  if (!owed) back(`/account/bookings/${id}`, 'success', 'Your deposit is already paid.')
  const url = await checkoutUrl(b, `Deposit: ${b.service_name} (#${b.id})`, owed, user.email)
  redirect(url)
}
