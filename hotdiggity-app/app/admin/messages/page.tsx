import Flash from '@/components/Flash'
import { all } from '@/lib/db'
import { markMessageHandled } from '@/lib/admin-actions'

export default async function Messages(props: PageProps<'/admin/messages'>) {
  const inbox = all<{ id: number; name: string; email: string; phone: string; message: string; handled: number; created_at: string }>(
    'SELECT * FROM contact_messages ORDER BY handled, id DESC LIMIT 100')
  const log = all<{ id: number; channel: string; recipient: string; subject: string; body: string; status: string; created_at: string }>(
    'SELECT * FROM notifications ORDER BY id DESC LIMIT 100')
  return (
    <div className="stack">
      <h1>Messages</h1>
      <Flash searchParams={props.searchParams} />
      <section>
        <h2>From the website contact form</h2>
        {inbox.length === 0 && <p className="muted">No messages.</p>}
        <div className="stack">
          {inbox.map((m) => (
            <div key={m.id} className="card" style={{ opacity: m.handled ? 0.6 : 1 }}>
              <div className="page-head" style={{ marginBottom: 6 }}>
                <strong>{m.name}</strong>
                <span className="small muted">{m.created_at} · <a href={`mailto:${m.email}`}>{m.email}</a> {m.phone && <>· <a href={`tel:${m.phone}`}>{m.phone}</a></>}</span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
              {!m.handled && <form action={markMessageHandled}><input type="hidden" name="id" value={m.id} /><button className="btn small secondary">Mark handled</button></form>}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Emails & texts sent</h2>
        <p className="muted small">Every automatic email and text, including ones that couldn't go out because that connection is off.</p>
        <div className="table-wrap"><table>
          <thead><tr><th>When</th><th>Type</th><th>To</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>{log.map((n) => (
            <tr key={n.id}>
              <td className="small">{n.created_at}</td><td>{n.channel}</td><td className="small">{n.recipient}</td>
              <td className="small"><strong>{n.subject}</strong>{n.subject && <br />}{n.body.slice(0, 160)}{n.body.length > 160 && '…'}</td>
              <td><span className={`pill ${n.status === 'sent' ? 'ok' : n.status.startsWith('failed') ? 'bad' : 'warn'}`}>{n.status}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  )
}
