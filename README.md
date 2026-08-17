# My Revision Diary

A handwritten diary that remembers when to revise. Write down what you studied
on a day; every revision date is worked out for you and appears on the page
automatically.

One account, one diary, on every device she signs into. Writes land in the
local cache first and reach the other device when there's a connection, so the
app still works in full with no network — it just catches up later.

## Running it locally

```bash
npm install
cp .env.example .env   # then fill it in — see "Setting up sync"
npm run dev
```

## Setting up sync

The app needs a Firebase project of its own. Once, from the
[Firebase console](https://console.firebase.google.com):

1. **Create a project.** Analytics is not needed.
2. **Authentication → Sign-in method → Email/Password → Enable.** Leave the
   passwordless email-link option off; the app uses a password, which is the
   one method that works cleanly inside an installed iPad app (a magic link
   opens in Safari rather than in the app).
3. **Firestore Database → Create database.** Pick the region nearest her and
   start in production mode — the rules below replace whatever it starts with.
4. **Project settings → General → Your apps → Web app.** Register one, then
   copy the six `firebaseConfig` values into `.env`.
5. **Publish the security rules** in `firestore.rules`:

   ```bash
   npx firebase deploy --only firestore:rules --project your-project-id
   ```

   Or paste the file into Firestore → Rules → Publish. Until you do, the
   database is either wide open or shut, depending on the mode you chose — the
   rules are what limit each person to their own diary.

Vercel needs the same six values under **Settings → Environment Variables**,
after which the deployed app is ready to sign into.

### Working against the emulators

To try things out without touching the real diary, add
`VITE_USE_FIREBASE_EMULATOR=1` to `.env` and run, in another terminal:

```bash
npx firebase emulators:start --project demo-diary --only auth,firestore
```

Auth and Firestore then run locally with throwaway data. This needs Java
installed; the rest of the app does not.

## Where the data lives

Firestore, under `users/{uid}` — one document per topic in `entries`, one per
scheduled revision in `revisions`, and a single `meta/settings`. The rule in
`firestore.rules` allows access only where the signed-in uid matches the one
in the path, so two people using the app never see each other's diaries.

A copy of everything also sits in the browser's local cache, which is what the
app reads from: switching months and searching never touch the network.

Anything written on a device *before* signing in for the first time is carried
up into the account automatically on that first sign-in, keyed by its original
ids so it can't be duplicated.

## Deploying so she can use it on her laptop

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, **Add New → Project**,
   pick the repo. Vercel detects Vite on its own — accept the defaults and deploy.
3. Send her the `*.vercel.app` URL.
4. She opens it in Chrome or Edge and clicks the **install** icon in the address
   bar (or ⋮ → *Cast, save and share* → *Install page as app*). It then lives in
   her Start menu with its own icon and window, and works offline.

Pushing to `main` redeploys automatically; her installed app picks the update up
on next launch.

## How the scheduling works

The gear icon opens *How often things come back* — a list of intervals, e.g.
`7 · 30 · 60 · 120` days. Saving an entry immediately writes one revision row
per interval.

- **Anchor `studyDate`** — intervals count from the day she studied it, so
  `7 · 30 · 60` means day 7, day 30, day 60.
- **Anchor `previousRevision`** — intervals stack: day 7, day 37, day 97.
- Changing the pattern later only moves revisions that are still *pending*.
  Anything ticked off is history: it stays put, and no new revision is ever
  scheduled on or before a date she has already completed.
- A pending revision whose date has passed shows as **Slipped past me** on
  today until it's ticked. Later revisions in the chain don't shift.

## The look

It should read as a diary, not a calendar app.

- **Type** — `Patrick Hand` for everything you actually read, `Caveat` for
  headings only, and only above ~24px where a cursive face is still easy. Both
  are OFL, self-hosted from `public/fonts/` and precached by the service worker,
  so the handwriting survives being offline. Nothing is loaded from a font CDN.
  Neither face has a true italic, so nothing in the UI is italicised — a
  synthesised slant on a handwriting face is markedly harder to read.
- **Contrast** — every ink clears WCAG AA (4.5:1) against both the page and the
  tinted panels, in both themes, `--ink-faint` included. It is the small print
  that needs it most, since it's set in handwriting.
- **Paper** — cream page with a rose margin rule, a bound left edge, and a faint
  noise tile for tooth. Ruled lines appear on the pages you actually write on
  (the day page, the settings page), not behind the month grid.
- **Ink** — one accent violet, gold for today (circled by hand), red for
  anything overdue. Subjects each get a pen from a fixed palette in
  `lib/colors.ts`; the tag colour is mixed with `--ink` at render time, so the
  same expression stays legible in both themes.
- **Night** — the moon icon swaps the page to a dusky sheet with cream ink.
- Corners are set with uneven `border-radius` values (`.hand-edge`) and hover
  states tilt a fraction of a degree, so nothing looks ruler-drawn.

## Layout

```
src/
  lib/firebase.ts    app init, persistent cache, emulator switch
  db/schema.ts       the record types + Settings defaults
  db/DiaryContext.tsx  auth state and three live listeners; the whole diary is
                     held here and everything else reads it from context
  db/storage.ts      every write goes through here
  db/legacy.ts       reads the old device-only Dexie diary, for migration only
  lib/select.ts      pure filters over the loaded diary (what used to be queries)
  lib/schedule.ts    planRevisions / buildRevisions / reconcileRevisions
  lib/dates.ts       'yyyy-MM-dd' keys, month grid, interval phrasing
  lib/colors.ts      the pencil case — one pen per subject
  index.css          fonts, paper/ink variables, the handwritten primitives
  components/        SignIn, Toolbar, CalendarGrid, DayCell, DayModal,
                     EntryForm, RevisionPane, SettingsPanel, SearchOverlay
```

Dates are stored as `yyyy-MM-dd` strings throughout, never `Date` objects, so
nothing shifts across timezones or DST.

**Writes are deliberately not awaited to completion.** Firestore applies a write
to the local cache straight away, but the promise from `commit()` only settles
once a server has acknowledged it — which never happens while she's offline. So
`db/storage.ts` lets the local write land and leaves the round-trip to finish on
its own. Awaiting it would hang the UI on a train. If you add a write, follow the
same pattern.

## Tests

```bash
npm test
```

Covers `lib/select.ts` — the range and overdue boundaries that used to be
enforced by Dexie's indexes and are now hand-written filters.

## Keyboard

| Key | Action |
| --- | --- |
| `←` `→` | previous / next month, or previous / next **day** with a page open |
| `T` | open today |
| `/` | search |
| `Esc` | close a page |

The day arrows only fire when the cursor isn't in a field, so they never
interfere with typing. That is also why `EntryForm` claims focus when the page
opens rather than on every date change — otherwise the form would swallow them.
