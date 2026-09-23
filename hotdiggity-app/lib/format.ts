export function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function parseMoney(input: FormDataEntryValue | null): number {
  const n = Number(String(input ?? '').replace(/[$,\s]/g, ''))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0
}

// Dates are stored as YYYY-MM-DD strings in Pacific time, the way the front desk thinks about them.
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86_400_000)
}

export function weekday(iso: string): number {
  return new Date(iso + 'T12:00:00Z').getUTCDay()
}

export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T12:00:00Z'))
}

export function niceDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export function niceTime(hhmm: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

export const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
  declined: 'Declined',
}

export const UNIT_LABEL: Record<string, string> = {
  night: 'per night',
  day: 'per day',
  visit: 'per visit',
  package: 'per package',
}

export function str(v: FormDataEntryValue | null, max = 2000): string {
  return String(v ?? '').trim().slice(0, max)
}
