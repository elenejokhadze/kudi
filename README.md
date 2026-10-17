# Kudi Pet Care

A shared pet-care web app for the whole family: feeding log ("who fed, when"), vet-prescribed medicine, vaccines, heat cycles, weight, pantry, age guide, travel checklists, reminders, XP, streaks and badges. It works on phones and can be installed to the home screen.

No build step and no dependencies: one page (`public/index.html`) plus one small serverless function (`api/household.js`).

```
kudi-pet-care/
├── public/
│   ├── index.html            the whole app (HTML, CSS and JavaScript in one file)
│   ├── sw.js                 offline support + opens the app when a notification is tapped
│   ├── manifest.webmanifest  "Add to Home Screen" settings
│   └── icon-*.png            app icons
├── api/
│   └── household.js          stores each family's data in Upstash Redis
├── vercel.json
└── package.json
```

## 1. Put it on your desktop

Unzip `kudi-pet-care.zip` to your Desktop, then open a terminal:

```bash
cd ~/Desktop/kudi-pet-care
```

(On Windows PowerShell: `cd $HOME\Desktop\kudi-pet-care`)

You need **Node.js 18 or newer**. Check with `node -v`. Install it from https://nodejs.org if needed.

## 2. Run it on your computer

Quickest (no account needed, data stays in your browser):

```bash
npm run preview
```

Open http://localhost:3000.

With the API, exactly like Vercel will run it:

```bash
npm i -g vercel        # once
vercel login           # once
vercel dev
```

## 3. Publish on Vercel

```bash
vercel                 # first time: links the folder to a new Vercel project and makes a preview link
vercel --prod          # publishes to your production address, e.g. https://kudi-pet-care.vercel.app
```

When `vercel` asks questions the first time, accept the defaults. The settings in `vercel.json` already tell Vercel there is no build step and that the site lives in `public/`.

## 4. Turn on family sharing (free database)

Without a database the app works, but each phone keeps its own data. To share one pet between family members:

1. Open your project at https://vercel.com/dashboard.
2. Go to **Storage** → **Create Database** → **Upstash** → **Upstash for Redis** (the free plan is enough).
3. Connect it to the `kudi-pet-care` project. Vercel adds the environment variables `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
4. Publish again: `vercel --prod`.

Then open the app, go to **Me → Invite your family**, and send the link. Whoever opens it joins the same household and picks their name. Changes show up on the other phones within about 10 seconds.

To use the database with `vercel dev` on your computer too:

```bash
vercel env pull .env.local
vercel dev
```

## 5. Install on a phone

- **iPhone:** open the link in Safari → Share → **Add to Home Screen** → open Kudi from the home screen → Me → Reminders → Phone notifications → **Allow**.
- **Android:** open the link in Chrome → menu → **Install app** (or Add to Home screen) → allow notifications in the Reminders panel.

## Editing the app

Everything is in `public/index.html`:

- Colours and fonts: the `:root { ... }` block at the top of the `<style>`.
- Food, treats and toys guide by age: `const GUIDE` and `const NEVER`.
- Travel checklists: `function tripSteps(...)`.
- XP values, levels and badges: `const XP`, `const LEVELS`, `const BADGES`.
- Sample pet: `function makeSample()`.

After an edit, check it with `npm run preview` (or `vercel dev`), then publish with `vercel --prod`.

Optional: keep it in Git and let Vercel publish on every push.

```bash
git init
git add .
git commit -m "Kudi Pet Care"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/<you>/kudi-pet-care.git
git push -u origin main
```

Then in Vercel: **Add New → Project → Import** that repository.

## Good to know

- **Reminders:** while the app is open (or installed and running in the background), reminders show as pop-ups with a chime and as phone notifications. When the app is fully closed it can't wake itself up. Use the **Add to Google Calendar** buttons in the Reminders panel for alerts that always arrive. True push notifications when closed need a push server (Web Push + a scheduled job), which is a good next step.
- **Privacy:** the family invite link is the key to that household's data. Anyone with the link can see and change it. Fine for a pilot; add user accounts before a public launch.
- **Medical content:** the age guide, vaccine repeat intervals, heat-cycle timings and travel rules are general guidance. Have a vet review them, and name someone to keep the travel rules current.
- **Languages:** the language switch on the welcome screen is a placeholder; Georgian and Russian text still need translating.

## Design system and evals

- `design/tokens.css`: every colour, type size, spacing, radius and layout value. `design/index.html` shows them visually; it is built from `design/page.template.html` with `npm run design`.
- Icons: Lucide only (`lucide-static`), 2px stroke, `currentColor`. No hand-drawn icons.
- `npm test`: design evals (`evals/design/`). They check WCAG contrast for every text and UI colour pair in light and dark, that both dark blocks match, one lime primary colour, no orange, a feature card with at most one pink detail, Figtree only, the type scale, the 4px spacing grid, the radius set, and that every icon is an exact Lucide icon. Icon checks need `npm install`.
- `npm run eval:jev`: Jev decision evals (`evals/decisions/`). Each palette decision is asked with its options in two orders to catch position bias; results go to `evals/results/`. Needs `npm install` and a Jev key: `cp .env.example .env.local`, then put your key after `TYPESAFE_API_KEY=`.
