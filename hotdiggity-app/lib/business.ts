// Facts about the business that show up across the site. Edit here, and every page updates.
export const BUSINESS = {
  name: 'Hot Diggity Dog Resort',
  shortName: 'HDDR',
  tagline: "Escondido's home away from home for dogs",
  street: '2750 Auto Park Way, Ste 22',
  city: 'Escondido',
  state: 'CA',
  zip: '92029',
  phone: '(760) 745-9900',
  phoneHref: 'tel:+17607459900',
  email: 'info@hotdiggitydogresort.com',
  hours: [
    ['Monday – Saturday', '6:30 am – 6:00 pm'],
    ['Sunday', 'Closed'],
  ] as const,
  // Opening/closing times used to validate drop-off and pickup (24h clock).
  open: '06:30',
  close: '18:00',
  closedWeekdays: [0], // Sunday
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=2750+Auto+Park+Way+Ste+22+Escondido+CA+92029',
  instagram: 'https://www.instagram.com/hotdiggitydogresort/',
  yelp: 'https://www.yelp.com/biz/hot-diggity-dog-resort-escondido',
  // The camera feed provider's viewer link. Paste it here when you have it.
  webcamUrl: '',
  team: [
    {
      name: 'Penny DiLoreto',
      title: 'Master Groomer · Certified Animal Behaviorist · Professional Dog Trainer',
    },
    { name: 'David DiLoreto', title: 'Certified Pet Nutritionist' },
  ],
}

export const fullAddress = `${BUSINESS.street}, ${BUSINESS.city}, ${BUSINESS.state} ${BUSINESS.zip}`

export const VACCINE_KINDS = ['Rabies', 'DHPP', 'Bordetella', 'Canine Influenza', 'Leptospirosis'] as const
