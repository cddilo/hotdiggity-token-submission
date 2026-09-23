import Flash from '@/components/Flash'
import PetFields from '@/components/PetForm'
import { savePet } from '@/lib/customer-actions'

export default function NewPet(props: PageProps<'/account/pets/new'>) {
  return (
    <div>
      <h1>Add a dog</h1>
      <Flash searchParams={props.searchParams} />
      <form action={savePet} className="form card">
        <PetFields />
        <button className="btn" type="submit">Save and continue</button>
      </form>
    </div>
  )
}
