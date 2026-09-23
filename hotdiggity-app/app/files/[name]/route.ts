// Serves uploaded vaccination records, only to the dog's owner or staff.
import fs from 'node:fs/promises'
import path from 'node:path'
import { currentUser } from '@/lib/auth'
import { one, UPLOAD_DIR } from '@/lib/db'

const TYPES: Record<string, string> = {
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png', '.heic': 'image/heic', '.webp': 'image/webp',
}

export async function GET(_req: Request, ctx: RouteContext<'/files/[name]'>) {
  const { name } = await ctx.params
  if (!/^[a-f0-9]{32}\.[a-z]+$/.test(name)) return new Response('Not found', { status: 404 })
  const user = await currentUser()
  if (!user) return new Response('Please log in', { status: 401 })
  const isStaff = user.role === 'staff' || user.role === 'admin'
  const owns = one('SELECT 1 FROM vaccinations v JOIN pets p ON p.id = v.pet_id WHERE v.file_name = ? AND p.owner_id = ?', name, user.id)
  if (!isStaff && !owns) return new Response('Not found', { status: 404 })
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name))
    return new Response(data, {
      headers: {
        'Content-Type': TYPES[path.extname(name)] ?? 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
