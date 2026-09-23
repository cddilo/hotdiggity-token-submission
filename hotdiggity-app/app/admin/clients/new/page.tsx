import Flash from '@/components/Flash'
import ClientFields from '@/components/ClientFields'
import { saveClient } from '@/lib/admin-actions'

export default function NewClient(props: PageProps<'/admin/clients/new'>) {
  return (
    <div>
      <h1>Add a client</h1>
      <p className="muted">For walk-ins and phone bookings. They can set their own password later with "Forgot password".</p>
      <Flash searchParams={props.searchParams} />
      <form action={saveClient} className="form card">
        <ClientFields />
        <div><button className="btn" type="submit">Add client</button></div>
      </form>
    </div>
  )
}
