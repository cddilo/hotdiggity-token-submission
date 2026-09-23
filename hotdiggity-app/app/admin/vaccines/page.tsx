import Link from 'next/link'
import Flash from '@/components/Flash'
import { all } from '@/lib/db'
import { verifyVaccination } from '@/lib/admin-actions'
import { niceDate } from '@/lib/format'

export default async function VaccineQueue(props: PageProps<'/admin/vaccines'>) {
  const rows = all<{ id: number; kind: string; expires_on: string; file_name: string | null; created_at: string; pet_name: string; owner_id: number; first_name: string; last_name: string }>(
    `SELECT v.*, p.name AS pet_name, u.id AS owner_id, u.first_name, u.last_name
     FROM vaccinations v JOIN pets p ON p.id = v.pet_id JOIN users u ON u.id = p.owner_id
     WHERE v.verified = 0 ORDER BY v.created_at`)
  return (
    <div>
      <h1>Shot records to verify</h1>
      <p className="muted">Open each record, check the date against the paperwork, fix it if the client typed it wrong, then verify.</p>
      <Flash searchParams={props.searchParams} />
      {rows.length === 0 ? <p className="muted">All caught up.</p> : (
        <div className="stack">
          {rows.map((v) => (
            <div key={v.id} className="card">
              <div className="page-head" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{v.pet_name}: {v.kind}</h3>
                <span className="muted small">Owner: <Link href={`/admin/clients/${v.owner_id}`}>{v.first_name} {v.last_name}</Link> · uploaded {v.created_at.slice(0, 10)}</span>
              </div>
              {v.file_name && <p><a href={`/files/${v.file_name}`} target="_blank" className="btn secondary small">Open the record</a></p>}
              <div className="grid two">
                <form action={verifyVaccination} className="filters">
                  <input type="hidden" name="id" value={v.id} /><input type="hidden" name="verdict" value="ok" />
                  <div className="field"><label>Expires (client said {niceDate(v.expires_on)})</label><input name="expires_on" type="date" defaultValue={v.expires_on} /></div>
                  <button className="btn ok small" type="submit">Verify</button>
                </form>
                <form action={verifyVaccination} className="filters">
                  <input type="hidden" name="id" value={v.id} /><input type="hidden" name="verdict" value="reject" />
                  <div className="field" style={{ flex: 1 }}><label>Reason (emailed to owner)</label><input name="message" type="text" placeholder="Photo is blurry / wrong dog / expired" /></div>
                  <button className="btn danger small" type="submit">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
