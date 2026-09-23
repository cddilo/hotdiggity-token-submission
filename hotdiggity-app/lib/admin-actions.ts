'use server'
import { redirect } from 'next/navigation'
import { requireAdmin, requireStaff, hashPassword } from './auth'
import { all, one, run, setSetting, tx, type BookingStatus, type Pet, type Service, type User } from './db'
import { back } from './flash'
import { isISODate, money, niceDate, parseMoney, str, todayISO } from './format'
import { BOOKING_VIEW_SQL, fullDates, quote, type BookingView } from './bookings'
import { sendEmail, sendText, siteUrl } from './notify'
import { BUSINESS, VACCINE_KINDS } from './business'
import { storeUpload } from './uploads'

function loadBooking(id: number): BookingView {
  const b = one<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.id = ?`, id)
  if (!b) back('/admin/bookings', 'error', 'Booking not found.')
  return b
}

async function tellCustomer(b: BookingView, subject: string, text: string, sms: string) {
  const user = one<User>('SELECT * FROM users WHERE id = ?', b.user_id)!
  await sendEmail(user.email, subject, `Hi ${user.first_name},\n\n${text}\n\n${siteUrl('/account/bookings/' + b.id)}\n\n${BUSINESS.name}\n${BUSINESS.phone}`)
  if (user.sms_opt_in) await sendText(user.phone, `${BUSINESS.shortName}: ${sms}`)
}

const TRANSITIONS: Record<string, BookingStatus[]> = {
  requested: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: ['requested'],
  declined: ['requested'],
}

export async function setBookingStatus(formData: FormData) {
  await requireStaff()
  const id = Number(formData.get('id'))
  const to = str(formData.get('status')) as BookingStatus
  const b = loadBooking(id)
  const here = `/admin/bookings/${id}`
  if (!TRANSITIONS[b.status]?.includes(to)) back(here, 'error', `Can't move a ${b.status} booking to ${to}.`)

  if (to === 'confirmed') {
    const service = one<Service>('SELECT * FROM services WHERE id = ?', b.service_id)!
    const petCount = Number(one<{ n: number }>('SELECT COUNT(*) AS n FROM booking_pets WHERE booking_id = ?', id)?.n)
    const full = fullDates(service, b.start_date, b.end_date, petCount, id)
    if (full.length && !formData.get('override')) {
      back(here, 'error', `Over capacity on ${full.map(niceDate).join(', ')}. Tick "confirm anyway" if you've made room.`)
    }
  }
  run("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?", to, id)

  const when = b.start_date === b.end_date ? niceDate(b.start_date) : `${niceDate(b.start_date)} – ${niceDate(b.end_date)}`
  const reason = str(formData.get('message'), 500)
  if (to === 'confirmed') {
    const deposit = b.deposit_cents > b.paid_cents ? `\n\nA ${money(b.deposit_cents - b.paid_cents)} deposit holds your spot. You can pay it online from your booking page.` : ''
    await tellCustomer(b, `Confirmed: ${b.pet_names}, ${when}`,
      `Good news! ${b.service_name} for ${b.pet_names} on ${when} is confirmed.${deposit}${reason ? '\n\n' + reason : ''}`,
      `${b.pet_names}'s ${b.service_name.toLowerCase()} on ${when} is confirmed. See you soon!`)
  } else if (to === 'declined') {
    await tellCustomer(b, `About your request for ${b.pet_names}`,
      `We're sorry, we can't take ${b.pet_names} for ${b.service_name} on ${when}.${reason ? '\n\n' + reason : ''}\n\nPlease call us and we'll try to find another option.`,
      `Sorry, we can't fit ${b.pet_names} in on ${when}. Please call ${BUSINESS.phone} so we can help.`)
  } else if (to === 'checked_out') {
    await tellCustomer(b, `Thanks for staying with us, ${b.pet_names}!`,
      `${b.pet_names} is headed home. Thank you for trusting us. We'd love to see you again.`, `Thanks for visiting! ${b.pet_names} was a pleasure.`)
  } else if (to === 'cancelled' && reason) {
    await tellCustomer(b, `Booking cancelled: ${b.pet_names}, ${when}`, reason, `Your booking for ${when} has been cancelled. ${reason}`.slice(0, 300))
  }
  back(here, 'success', `Marked ${to.replace('_', ' ')}.`)
}

export async function updateBooking(formData: FormData) {
  await requireStaff()
  const id = Number(formData.get('id'))
  const b = loadBooking(id)
  const here = `/admin/bookings/${id}`
  const start = str(formData.get('start_date'))
  const end = str(formData.get('end_date')) || start
  if (!isISODate(start) || !isISODate(end) || end < start) back(here, 'error', 'Check the dates.')
  const service = one<Service>('SELECT * FROM services WHERE id = ?', b.service_id)!
  const petCount = Number(one<{ n: number }>('SELECT COUNT(*) AS n FROM booking_pets WHERE booking_id = ?', id)?.n)
  // Re-price when dates change, unless the desk typed its own total.
  const typedTotal = str(formData.get('total'))
  const total = typedTotal ? parseMoney(typedTotal) : quote(service, start, end, petCount).total_cents
  run(`UPDATE bookings SET start_date=?, end_date=?, dropoff_time=?, pickup_time=?, staff_notes=?, total_cents=?, deposit_cents=?, updated_at=datetime('now') WHERE id=?`,
    start, end, str(formData.get('dropoff_time'), 5), str(formData.get('pickup_time'), 5), str(formData.get('staff_notes'), 4000),
    total, Math.min(parseMoney(formData.get('deposit')), total), id)
  back(here, 'success', 'Booking updated.')
}

export async function recordPayment(formData: FormData) {
  const staff = await requireStaff()
  const id = Number(formData.get('id'))
  loadBooking(id)
  const amount = parseMoney(formData.get('amount'))
  const method = str(formData.get('method'), 40) || 'cash'
  const refund = formData.get('refund') === '1'
  if (!amount) back(`/admin/bookings/${id}`, 'error', 'Enter an amount.')
  const signed = refund ? -amount : amount
  tx(() => {
    run('INSERT INTO payments (booking_id, amount_cents, method, reference, recorded_by) VALUES (?, ?, ?, ?, ?)',
      id, signed, refund ? `refund (${method})` : method, str(formData.get('reference'), 200), staff.id)
    run("UPDATE bookings SET paid_cents = paid_cents + ?, updated_at = datetime('now') WHERE id = ?", signed, id)
  })
  back(`/admin/bookings/${id}`, 'success', `${refund ? 'Refund' : 'Payment'} of ${money(amount)} recorded.`)
}

export async function addReportCard(formData: FormData) {
  const staff = await requireStaff()
  const id = Number(formData.get('id'))
  const b = loadBooking(id)
  const petId = Number(formData.get('pet_id'))
  const pet = one<Pet>('SELECT p.* FROM booking_pets bp JOIN pets p ON p.id = bp.pet_id WHERE bp.booking_id = ? AND p.id = ?', id, petId)
  if (!pet) back(`/admin/bookings/${id}`, 'error', 'Pick a dog.')
  const mood = str(formData.get('mood'), 200)
  const ate = str(formData.get('ate'), 200)
  const note = str(formData.get('note'), 2000)
  run('INSERT INTO report_cards (booking_id, pet_id, day, ate, mood, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, petId, todayISO(), ate, mood, note, staff.id)
  if (formData.get('send')) {
    await tellCustomer(b, `${pet.name}'s report card`, `Here's how ${pet.name}'s day went:\n\nMood: ${mood}\nMeals: ${ate}\n\n${note}`,
      `${pet.name}'s report card is up: ${mood}. ${siteUrl('/account/bookings/' + id)}`)
  }
  back(`/admin/bookings/${id}`, 'success', 'Report card saved.')
}

export async function verifyVaccination(formData: FormData) {
  await requireStaff()
  const id = Number(formData.get('id'))
  const verdict = str(formData.get('verdict'))
  const returnTo = str(formData.get('return_to')) || '/admin/vaccines'
  const safeReturn = returnTo.startsWith('/admin') ? returnTo : '/admin/vaccines'
  if (verdict === 'reject') {
    const v = one<{ pet_id: number; kind: string; owner_id: number; pet_name: string }>(
      'SELECT v.*, p.owner_id, p.name AS pet_name FROM vaccinations v JOIN pets p ON p.id = v.pet_id WHERE v.id = ?', id)
    run('DELETE FROM vaccinations WHERE id = ?', id)
    const owner = v && one<User>('SELECT * FROM users WHERE id = ?', v.owner_id)
    if (owner && v) {
      await sendEmail(owner.email, `We need a new ${v.kind} record for ${v.pet_name}`,
        `Hi ${owner.first_name},\n\nWe couldn't verify the ${v.kind} record you uploaded for ${v.pet_name}. ${str(formData.get('message'), 500)}\n\nPlease upload a clear copy here: ${siteUrl('/account/pets/' + v.pet_id)}\n\n${BUSINESS.name}\n${BUSINESS.phone}`)
    }
    back(safeReturn, 'success', 'Record rejected and the owner was emailed.')
  }
  const expires = str(formData.get('expires_on'))
  if (expires && isISODate(expires)) run('UPDATE vaccinations SET verified = 1, expires_on = ? WHERE id = ?', expires, id)
  else run('UPDATE vaccinations SET verified = 1 WHERE id = ?', id)
  back(safeReturn, 'success', 'Record verified.')
}

export async function staffAddVaccination(formData: FormData) {
  await requireStaff()
  const petId = Number(formData.get('pet_id'))
  const pet = one<Pet>('SELECT * FROM pets WHERE id = ?', petId)
  if (!pet) back('/admin/clients', 'error', 'Pet not found.')
  const here = `/admin/clients/${pet.owner_id}`
  const kind = str(formData.get('kind'))
  const expires = str(formData.get('expires_on'))
  if (!(VACCINE_KINDS as readonly string[]).includes(kind) || !isISODate(expires)) back(here, 'error', 'Choose the vaccine and its expiration date.')
  const fileName = await storeUpload(formData.get('file'), here)
  run('INSERT INTO vaccinations (pet_id, kind, expires_on, file_name, verified) VALUES (?, ?, ?, ?, 1)', petId, kind, expires, fileName)
  back(here, 'success', `${kind} added for ${pet.name}.`)
}

export async function saveClient(formData: FormData) {
  await requireStaff()
  const id = Number(formData.get('id')) || 0
  const email = str(formData.get('email'), 200).toLowerCase()
  const first = str(formData.get('first_name'), 80)
  const last = str(formData.get('last_name'), 80)
  const here = id ? `/admin/clients/${id}` : '/admin/clients/new'
  if (!email.includes('@') || !first) back(here, 'error', 'Name and email are required.')
  const clash = one<User>('SELECT * FROM users WHERE email = ? AND id != ?', email, id)
  if (clash) back(here, 'error', `${email} already belongs to another client.`)
  const fields = [first, last, email, str(formData.get('phone'), 40), str(formData.get('address'), 300),
    str(formData.get('emergency_contact'), 300), formData.get('sms_opt_in') ? 1 : 0, str(formData.get('staff_notes'), 4000)] as const
  if (id) {
    run('UPDATE users SET first_name=?, last_name=?, email=?, phone=?, address=?, emergency_contact=?, sms_opt_in=?, staff_notes=? WHERE id=?', ...fields, id)
    back(here, 'success', 'Client saved.')
  }
  const { id: newId } = run('INSERT INTO users (first_name, last_name, email, phone, address, emergency_contact, sms_opt_in, staff_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ...fields)
  back(`/admin/clients/${newId}`, 'success', 'Client added. They can set a password with "Forgot password" on the login page.')
}

export async function staffSavePet(formData: FormData) {
  await requireStaff()
  const id = Number(formData.get('id')) || 0
  const ownerId = Number(formData.get('owner_id'))
  const here = `/admin/clients/${ownerId}`
  const name = str(formData.get('name'), 80)
  if (!name) back(here, 'error', 'Pet name is required.')
  const weight = Number(formData.get('weight_lbs'))
  const vals = [name, str(formData.get('breed'), 120), str(formData.get('sex'), 20),
    isISODate(str(formData.get('birthdate'))) ? str(formData.get('birthdate')) : '',
    Number.isFinite(weight) && weight > 0 ? weight : null, str(formData.get('color'), 80), formData.get('fixed') ? 1 : 0,
    str(formData.get('feeding')), str(formData.get('medications')), str(formData.get('allergies')), str(formData.get('behavior')),
    str(formData.get('vet_name'), 120), str(formData.get('vet_phone'), 40), str(formData.get('staff_notes')),
    formData.get('temperament_ok') ? 1 : 0] as const
  if (id) {
    run(`UPDATE pets SET name=?, breed=?, sex=?, birthdate=?, weight_lbs=?, color=?, fixed=?, feeding=?, medications=?, allergies=?,
         behavior=?, vet_name=?, vet_phone=?, staff_notes=?, temperament_ok=? WHERE id = ? AND owner_id = ?`, ...vals, id, ownerId)
  } else {
    if (!one('SELECT id FROM users WHERE id = ?', ownerId)) back('/admin/clients', 'error', 'Client not found.')
    run(`INSERT INTO pets (name, breed, sex, birthdate, weight_lbs, color, fixed, feeding, medications, allergies, behavior, vet_name, vet_phone, staff_notes, temperament_ok, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ...vals, ownerId)
  }
  back(here, 'success', `${name} saved.`)
}

// Front desk books on a client's behalf (phone-ins, walk-ins). Skips the shot check with a warning.
export async function staffCreateBooking(formData: FormData) {
  await requireStaff()
  const userId = Number(formData.get('user_id'))
  const service = one<Service>('SELECT * FROM services WHERE id = ?', Number(formData.get('service_id')))
  const here = `/admin/clients/${userId}`
  if (!service) back(here, 'error', 'Choose a service.')
  const start = str(formData.get('start_date'))
  const end = service.unit === 'visit' ? start : str(formData.get('end_date')) || start
  if (!isISODate(start) || !isISODate(end) || end < start) back(here, 'error', 'Check the dates.')
  const petIds = formData.getAll('pet_ids').map(Number).filter((pid) => one('SELECT id FROM pets WHERE id = ? AND owner_id = ?', pid, userId))
  if (!petIds.length) back(here, 'error', 'Choose at least one dog.')
  const q = quote(service, start, end, petIds.length)
  const status = formData.get('confirm') ? 'confirmed' : 'requested'
  const id = tx(() => {
    const { id } = run(`INSERT INTO bookings (user_id, service_id, start_date, end_date, dropoff_time, pickup_time, status, staff_notes, total_cents, deposit_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, userId, service.id, start, end, str(formData.get('dropoff_time'), 5), str(formData.get('pickup_time'), 5),
      status, str(formData.get('staff_notes')), q.total_cents, q.deposit_cents)
    for (const pid of petIds) run('INSERT INTO booking_pets (booking_id, pet_id) VALUES (?, ?)', id, pid)
    return id
  })
  redirect(`/admin/bookings/${id}?success=` + encodeURIComponent('Booking created.'))
}

export async function saveService(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get('id')) || 0
  const name = str(formData.get('name'), 120)
  const category = str(formData.get('category'))
  const unit = str(formData.get('unit'))
  if (!name || !['boarding', 'daycare', 'grooming', 'training', 'wellness'].includes(category) || !['night', 'day', 'visit', 'package'].includes(unit)) {
    back('/admin/services', 'error', 'Name, category, and unit are required.')
  }
  const vals = [name, category, unit, str(formData.get('description')), parseMoney(formData.get('price')),
    parseMoney(formData.get('deposit')), formData.get('bookable') ? 1 : 0, formData.get('active') ? 1 : 0, Number(formData.get('sort')) || 0] as const
  if (id) {
    run('UPDATE services SET name=?, category=?, unit=?, description=?, price_cents=?, deposit_cents=?, bookable=?, active=?, sort=? WHERE id=?', ...vals, id)
  } else {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
    run('INSERT INTO services (name, category, unit, description, price_cents, deposit_cents, bookable, active, sort, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ...vals, slug)
  }
  back('/admin/services', 'success', `${name} saved.`)
}

export async function markPricesReviewed() {
  await requireAdmin()
  setSetting('prices_reviewed', '1')
  back('/admin/services', 'success', 'Thanks! The price warning is gone.')
}

export async function saveSettings(formData: FormData) {
  await requireAdmin()
  for (const key of ['boarding_capacity', 'daycare_capacity', 'grooming_per_day']) {
    const n = Math.max(0, Math.floor(Number(formData.get(key)) || 0))
    setSetting(key, String(n))
  }
  const req = formData.getAll('required_vaccines').map(String).filter((k) => (VACCINE_KINDS as readonly string[]).includes(k))
  setSetting('required_vaccines', req.join(','))
  back('/admin/settings', 'success', 'Settings saved.')
}

export async function saveStaff(formData: FormData) {
  await requireAdmin()
  const email = str(formData.get('email'), 200).toLowerCase()
  const role = str(formData.get('role'))
  const password = String(formData.get('password') ?? '')
  if (!email.includes('@') || !['customer', 'staff', 'admin'].includes(role)) back('/admin/settings', 'error', 'Enter an email and role.')
  const existing = one<User>('SELECT * FROM users WHERE email = ?', email)
  if (existing) {
    run('UPDATE users SET role = ? WHERE id = ?', role, existing.id)
    if (password) {
      if (password.length < 8) back('/admin/settings', 'error', 'Passwords need at least 8 characters.')
      run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(password), existing.id)
    }
  } else {
    if (password.length < 8) back('/admin/settings', 'error', 'New staff accounts need a password of at least 8 characters.')
    run('INSERT INTO users (email, first_name, role, password_hash) VALUES (?, ?, ?, ?)',
      email, str(formData.get('first_name'), 80), role, await hashPassword(password))
  }
  back('/admin/settings', 'success', `${email} is now ${role}.`)
}

export async function markMessageHandled(formData: FormData) {
  await requireStaff()
  run('UPDATE contact_messages SET handled = 1 WHERE id = ?', Number(formData.get('id')))
  back('/admin/messages', 'success', 'Marked handled.')
}

export async function sendReminders() {
  await requireStaff()
  // Tomorrow's confirmed arrivals get a reminder text/email.
  const d = new Date(todayISO() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)
  const tomorrow = d.toISOString().slice(0, 10)
  const rows = all<BookingView>(`${BOOKING_VIEW_SQL} WHERE b.status = 'confirmed' AND b.start_date = ?`, tomorrow)
  for (const b of rows) {
    await tellCustomer(b, `See you tomorrow, ${b.pet_names}!`,
      `Reminder: ${b.service_name} for ${b.pet_names} starts tomorrow, ${niceDate(b.start_date)}. Please bring food in pre-portioned bags and any medications in their labeled containers.`,
      `Reminder: see ${b.pet_names} tomorrow (${niceDate(b.start_date)}). Reply or call ${BUSINESS.phone} with questions.`)
  }
  back('/admin', 'success', `Sent ${rows.length} reminder${rows.length === 1 ? '' : 's'} for tomorrow.`)
}

