import type { Pet } from '@/lib/db'

// Shared by the customer "add/edit dog" page and the front-desk client page.
export default function PetFields({ pet }: { pet?: Pet }) {
  return (
    <>
      <div className="row">
        <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" type="text" defaultValue={pet?.name} required /></div>
        <div className="field"><label htmlFor="breed">Breed</label><input id="breed" name="breed" type="text" defaultValue={pet?.breed} /></div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="sex">Sex</label>
          <select id="sex" name="sex" defaultValue={pet?.sex || ''}>
            <option value="">Choose…</option><option>Female</option><option>Male</option>
          </select>
        </div>
        <div className="field"><label htmlFor="birthdate">Birthday (approximate is fine)</label><input id="birthdate" name="birthdate" type="date" defaultValue={pet?.birthdate} /></div>
        <div className="field"><label htmlFor="weight_lbs">Weight (lbs)</label><input id="weight_lbs" name="weight_lbs" type="number" step="0.1" min="0" defaultValue={pet?.weight_lbs ?? ''} /></div>
        <div className="field"><label htmlFor="color">Color / markings</label><input id="color" name="color" type="text" defaultValue={pet?.color} /></div>
      </div>
      <label className="check"><input type="checkbox" name="fixed" defaultChecked={!!pet?.fixed} /> Spayed / neutered</label>
      <div className="field"><label htmlFor="feeding">Feeding instructions</label><textarea id="feeding" name="feeding" defaultValue={pet?.feeding} placeholder="e.g. 1 cup kibble, 7am and 5pm" /></div>
      <div className="row">
        <div className="field"><label htmlFor="medications">Medications</label><textarea id="medications" name="medications" defaultValue={pet?.medications} placeholder="Name, dose, and when" /></div>
        <div className="field"><label htmlFor="allergies">Allergies</label><textarea id="allergies" name="allergies" defaultValue={pet?.allergies} /></div>
      </div>
      <div className="field"><label htmlFor="behavior">Anything we should know?</label><textarea id="behavior" name="behavior" defaultValue={pet?.behavior} placeholder="Fears, favorite toys, how they do with other dogs…" /></div>
      <div className="row">
        <div className="field"><label htmlFor="vet_name">Veterinarian</label><input id="vet_name" name="vet_name" type="text" defaultValue={pet?.vet_name} /></div>
        <div className="field"><label htmlFor="vet_phone">Vet phone</label><input id="vet_phone" name="vet_phone" type="tel" defaultValue={pet?.vet_phone} /></div>
      </div>
    </>
  )
}
