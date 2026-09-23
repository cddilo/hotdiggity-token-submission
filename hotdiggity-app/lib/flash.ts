import { redirect } from 'next/navigation'

// Send the visitor back to a page with a message on it.
export function back(path: string, kind: 'error' | 'success', message: string): never {
  const sep = path.includes('?') ? '&' : '?'
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`)
}
