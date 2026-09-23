# Hot Diggity Dog Resort: Your Own Website and Booking System

This folder holds the whole thing: the public website, customer accounts, online booking, and the front desk
back office. Nothing is rented from EasyBusy or MyOwnWebsite. You own the code and the data.

Think of it like moving from a leased building to one you own. The rent goes away, but you're now the one who
calls the plumber. This guide covers what it does, what it costs, how to move in, and what to keep an eye on.

---

## What it does

**For customers (the public site)**
- Home, Services & Rates, Webcams, About, FAQ, Policies, and Contact pages
- Create an account, add their dogs, and upload shot records from a phone photo
- Request boarding, daycare, grooming, training, or teeth cleaning, with a live price estimate
- See upcoming stays, pay a deposit online, read daily report cards, and cancel if needed

**For you and your staff (the Front Desk, at `/admin`)**
- **Today:** who's arriving, who's going home, who's in the building, and requests waiting on you
- **Requests:** confirm or decline with one click. The client gets an email and a text automatically.
- **Check in / check out:** take payments (card, cash, check, Zelle) and issue refunds
- **Report cards:** a quick note on mood and meals, texted to the owner
- **Occupancy:** six weeks of how full boarding, daycare, and grooming are
- **Clients & dogs:** search, edit, book on someone's behalf, and track temperament checks
- **Shot records:** a queue of uploads to verify, and it refuses bookings when shots expire before the stay ends
- **Sales reports:** money collected by month, booked revenue by service line, and payment methods
- **Services & prices / Settings:** your rates, capacity limits, required vaccines, and staff logins

**House rules it enforces on its own**
- Closed Sundays. No drop-offs or pickups, but boarders stay over.
- Drop-off and pickup between 6:30 am and 6:00 pm
- Boarding is charged by the night. Pickup day is free.
- Extra dogs in the same suite get the family-suite rate.
- Won't overbook past your capacity (the desk can override)
- Rabies, DHPP, and Bordetella must be current through the last day of the stay

---

## Before you go live: your checklist

1. **Fix the prices.** I couldn't reach your current site from my workspace, so the price list is a
   placeholder. Log in, go to **Front Desk > Services & prices**, and put in your real rates. A yellow banner
   nags you until you do.
2. **Read the Policies and FAQ pages.** The cancellation windows (48 hours for boarding, 24 for grooming) are
   my guess at the industry norm. Change them to match what you actually do. The text lives in
   `app/policies/page.tsx` and `app/faq/page.tsx`.
3. **Webcam link.** Paste your camera provider's viewer link into `webcamUrl` in `lib/business.ts`.
4. **Photos.** The site has no photos of your place yet. Real photos of your suites and play areas will do
   more for bookings than anything else on the page. Send them over and I'll add them.
5. **Set your capacity** under **Settings & staff**: dogs per night, dogs per day, and grooms per day.

---

## Getting it online (about an hour, once)

You'll need four accounts. Each one is free to open.

### 1. GitHub (where the code lives)
Create a **private** repository called `hotdiggitydogresort-website`, and I'll move this code there.
(GitHub wouldn't let me create it for you.)

### 2. Render.com (the computer that runs the site)
1. Sign up at render.com with your GitHub login.
2. Click **New > Blueprint** and pick the repository. It reads `render.yaml` and sets everything up,
   including a 5 GB disk that holds your database and uploaded shot records.
3. It asks for the "secret" settings below. Leave any you don't have yet blank. The site runs without them.
4. Once it's running, open the **Shell** tab and create your owner login:
   ```
   npm run create-admin -- david@hotdiggitydogresort.com "David DiLoreto" "pick-a-strong-password"
   ```

### 3. Stripe (online deposits)
1. Sign up at stripe.com. Card numbers never touch your server; Stripe handles them.
2. Under **Developers > API keys**, copy the **Secret key** into `STRIPE_SECRET_KEY` on Render.
3. Under **Developers > Webhooks**, add the endpoint `https://hotdiggitydogresort.com/api/stripe/webhook`
   with the event `checkout.session.completed`. Copy its **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

### 4. Email and texts
- **Email:** Google Workspace works if that's what runs your hotdiggitydogresort.com mail.
  Set `SMTP_HOST=smtp.gmail.com`, `SMTP_USER` to your address, and `SMTP_PASS` to an
  [App Password](https://support.google.com/accounts/answer/185833). Set `STAFF_EMAIL` to the inbox
  that should get new-booking alerts.
- **Texts:** Sign up at twilio.com, buy a local 760 number, and complete the "A2P 10DLC" business
  registration. US carriers now require it, and it takes a few days. Then fill in the three `TWILIO_` settings.

Until email and texts are hooked up, every message is saved under **Front Desk > Messages**, so nothing is lost.

### 5. Point your domain
In Render, open **Settings > Custom Domains** and add `hotdiggitydogresort.com` and `www.hotdiggitydogresort.com`.
Render shows you two DNS records. Enter them wherever your domain is registered (GoDaddy, Google Domains/Squarespace,
or possibly EasyBusy itself). **Do this step last**, on cutover day.

---

## Moving over from EasyBusy (the safe way)

Don't flip the switch on a Friday before a holiday weekend. Here's the order I'd do it in:

1. **Run both side by side for a week or two.** Keep taking real bookings in EasyBusy. Use the new
   system on its Render web address (something like `hotdiggity.onrender.com`) to practice with staff.
2. **Export your clients from EasyBusy** as a CSV (one row per dog, with the owner's email). Then, in the Render Shell:
   ```
   npm run import-clients -- clients.csv            # preview, changes nothing
   npm run import-clients -- clients.csv --commit   # do it for real
   ```
   It matches columns loosely ("Owner Email," "Client Email," and "Email" all work), and it tells you which
   columns it used and which it skipped. Vaccine expiration dates come over if the export includes them.
3. **Re-enter future reservations.** The importer brings clients, dogs, and shots, but not bookings. From the
   client's page, the front desk can book on their behalf in about 30 seconds each.
4. **Cutover day:** point the domain (step 5 above), then send clients a short email saying you've
   moved to a new booking system and they should use "Forgot password" with the same email to get in.
5. **Keep EasyBusy for 30 days** as a safety net before you cancel, and download a final full export first.

---

## Running costs (rough, check current pricing)

| What | About |
|---|---|
| Render server + 5 GB disk | ~$8–10 / month |
| Stripe | 2.9% + 30¢ per online payment, no monthly fee |
| Twilio texts | ~1¢ per text, plus a small monthly number fee and one-time 10DLC registration |
| Email | Free if you already have Google Workspace |

Compare that with your EasyBusy bill and you'll see the savings.

---

## Backups: please don't skip this

Everything (clients, dogs, bookings, payments, shot records) lives on that one Render disk. Render keeps daily
snapshots of it, but I'd want a second copy you control too. Once a week, in the Render Shell:
```
npm run backup
```
Then download the newest folder under `/var/data/backups` and drop it in Google Drive. If you'd rather not
remember, I can set it up to happen on its own.

---

## Honest limits: what this doesn't do (yet)

These are the gaps compared with a big paid platform. Each can be added later.

- **No card reader at the counter.** In-store card payments go through whatever terminal you use today, and staff
  record them in the Front Desk. (Stripe sells a card reader that could be wired in.)
- **No packages or memberships** (like a 10-day daycare punch card) and no automatic tip handling
- **No groomer-by-groomer schedule.** Grooming is capped per day, not by time slot per groomer.
- **No automatic reminder schedule.** Reminders go out when someone clicks "Send tomorrow's reminders" on the
  Today screen. A daily automatic run is a small addition.
- **Not a mobile app.** It works well in a phone's web browser.
- **QuickBooks isn't connected.** The Sales reports give you the monthly numbers to enter.

---

## For a developer

Built with Next.js 16 and React 19, TypeScript, and Node 22's built-in SQLite. No database server is needed.
- `lib/db.ts`: schema, created automatically on first run
- `lib/bookings.ts`: pricing, capacity, and vaccine rules
- `lib/*-actions.ts`: every form submission, each one checking who's logged in
- `app/`: pages (`/account` is customers, `/admin` is the front desk)
- `npm run dev` for local work, and `npm run seed-demo` for pretend data
- Copy `.env.example` to `.env` for local settings
