import 'server-only'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { UPLOAD_DIR } from './db'
import { back } from './flash'

const ALLOWED_UPLOADS: Record<string, string> = {
  'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/heic': '.heic', 'image/webp': '.webp',
}

// Saves an uploaded record under a random name. Returns null when no file was chosen.
export async function storeUpload(file: FormDataEntryValue | null, onError: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null
  const ext = ALLOWED_UPLOADS[file.type]
  if (!ext) back(onError, 'error', 'Please upload a PDF or a photo (JPG, PNG, HEIC).')
  if (file.size > 10 * 1024 * 1024) back(onError, 'error', 'That file is over 10 MB. A phone photo of the paper works fine.')
  const name = crypto.randomBytes(16).toString('hex') + ext
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()))
  return name
}

