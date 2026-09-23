// The rules of the front desk: what a stay costs, whether there's room,
// and whether a dog's shots are current enough to come in.
import { all, one, getSetting, type Booking, type Pet, type Service, type Vaccination } from './db'
import { addDays, daysBetween, weekday } from './format'
import { BUSINESS } from './business'

export function requiredVaccines(): string[] {
  return getSetting('required_vaccines').split(',').map((s) => s.trim()).filter(Boolean)
}

export type VaccineStatus = { kind: string; expires_on: string | null; verified: boolean; ok: boolean }

// Shots must still be good on the last day of the stay, not just the first.
export function vaccineStatus(petId: number, throughDate: string): VaccineStatus[] {
  const vax = all<Vaccination>('SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY expires_on DESC', petId)
  return requiredVaccines().map((kind) => {
    const best = vax.find((v) => v.kind === kind)
    return {
      kind,
      expires_on: best?.expires_on ?? null,
      verified: !!best?.verified,
      ok: !!best && best.expires_on >= throughDate,
    }
  })
}

export function vaccinesOk(petId: number, throughDate: string): boolean {
  return vaccineStatus(petId, throughDate).every((v) => v.ok)
}

// The dates a booking occupies space. Boarding holds a spot each night (checkout day is free);
// daycare and appointments hold each calendar day they cover.
export function occupiedDates(category: Service['category'], start: string, end: string): string[] {
  const out: string[] = []
  const last = category === 'boarding' ? addDays(end, -1) : end
  for (let d = start; d <= last; d = addDays(d, 1)) out.push(d)
  return out
}

export function billableUnits(service: Service, start: string, end: string): number {
  if (service.unit === 'night') return Math.max(1, daysBetween(start, end))
  if (service.unit === 'day') {
    return occupiedDates(service.category, start, end).filter((d) => !BUSINESS.closedWeekdays.includes(weekday(d))).length
  }
  return 1
}

export type Quote = { lines: { label: string; cents: number }[]; total_cents: number; deposit_cents: number }

export function quote(service: Service, start: string, end: string, petCount: number): Quote {
  const units = billableUnits(service, start, end)
  const unitWord = service.unit === 'night' ? 'night' : service.unit === 'day' ? 'day' : 'visit'
  const lines: Quote['lines'] = []
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

  // Extra dogs in the same boarding suite get the family rate when one is set up.
  const family = service.category === 'boarding'
    ? one<Service>("SELECT * FROM services WHERE slug = 'boarding-shared' AND active = 1")
    : undefined

  lines.push({ label: `${service.name}: ${plural(units, unitWord)}`, cents: service.price_cents * units })
  if (petCount > 1) {
    const extraRate = family ? family.price_cents : service.price_cents
    const label = family ? `Additional dog${petCount > 2 ? 's' : ''} (family suite rate)` : `Additional dog${petCount > 2 ? 's' : ''}`
    lines.push({ label: `${label} × ${petCount - 1}`, cents: extraRate * units * (petCount - 1) })
  }
  const total = lines.reduce((s, l) => s + l.cents, 0)
  return { lines, total_cents: total, deposit_cents: Math.min(service.deposit_cents, total) }
}

function capacityFor(category: Service['category']): number {
  if (category === 'boarding') return Number(getSetting('boarding_capacity')) || 0
  if (category === 'daycare') return Number(getSetting('daycare_capacity')) || 0
  return Number(getSetting('grooming_per_day')) || 0
}

// How many dogs are already committed on each date for this category.
// Requests count too, so two families can't both be told "sure" for the last suite.
export function usageByDate(category: Service['category'], from: string, to: string, excludeBookingId = 0) {
  const rows = all<Booking & { pets: number }>(
    `SELECT b.*, (SELECT COUNT(*) FROM booking_pets bp WHERE bp.booking_id = b.id) AS pets
     FROM bookings b JOIN services s ON s.id = b.service_id
     WHERE s.category = ? AND b.status IN ('requested','confirmed','checked_in')
       AND b.start_date <= ? AND b.end_date >= ? AND b.id != ?`,
    category, to, from, excludeBookingId,
  )
  const usage = new Map<string, number>()
  for (const b of rows) {
    for (const d of occupiedDates(category, b.start_date, b.end_date)) {
      usage.set(d, (usage.get(d) ?? 0) + (category === 'grooming' || category === 'wellness' || category === 'training' ? 1 : b.pets))
    }
  }
  return usage
}

export function fullDates(service: Service, start: string, end: string, petCount: number, excludeBookingId = 0): string[] {
  const cap = capacityFor(service.category)
  if (!cap) return []
  const need = service.category === 'boarding' || service.category === 'daycare' ? petCount : 1
  const usage = usageByDate(service.category, start, end, excludeBookingId)
  return occupiedDates(service.category, start, end).filter((d) => (usage.get(d) ?? 0) + need > cap)
}

export type BookingView = Booking & {
  service_name: string; category: Service['category']; unit: Service['unit']
  first_name: string; last_name: string; email: string; phone: string; pet_names: string
}

export const BOOKING_VIEW_SQL = `
  SELECT b.*, s.name AS service_name, s.category, s.unit,
         u.first_name, u.last_name, u.email, u.phone,
         (SELECT GROUP_CONCAT(p.name, ', ') FROM booking_pets bp JOIN pets p ON p.id = bp.pet_id WHERE bp.booking_id = b.id) AS pet_names
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN users u ON u.id = b.user_id`

export function bookingPets(bookingId: number): Pet[] {
  return all<Pet>('SELECT p.* FROM booking_pets bp JOIN pets p ON p.id = bp.pet_id WHERE bp.booking_id = ? ORDER BY p.name', bookingId)
}
