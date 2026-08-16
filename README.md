# Revision Calendar

A spaced-repetition study planner. Log what you studied on a day; every revision
date is scheduled for you, and shows up on the calendar automatically.

All data lives in the browser on your own machine (IndexedDB). There is no
server, no account and no network call — which also means **the JSON backup is
the only copy**, so use the export button now and then.

## Running it locally

```bash
npm install
npm run dev
```

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

`Settings → Revision pattern` holds a list of intervals, e.g. `7 · 30 · 60 · 120`
days. Saving an entry immediately writes one revision row per interval.

- **Anchor `studyDate`** — intervals count from the day she studied it, so
  `7 · 30 · 60` means day 7, day 30, day 60.
- **Anchor `previousRevision`** — intervals stack: day 7, day 37, day 97.
- Changing the pattern later only moves revisions that are still *pending*.
  Anything ticked off is history: it stays put, and no new revision is ever
  scheduled on or before a date she has already completed.
- A pending revision whose date has passed shows as **Overdue** on today until
  it's ticked. Later revisions in the chain don't shift.

## Layout

```
src/
  db/schema.ts       Dexie tables + Settings defaults
  db/storage.ts      every read/write goes through here (swap this for a cloud
                     backend later without touching the UI)
  lib/schedule.ts    planRevisions / buildRevisions / reconcileRevisions
  lib/dates.ts       'yyyy-MM-dd' keys, month grid, interval phrasing
  lib/backup.ts      JSON export + import
  components/        Toolbar, CalendarGrid, DayCell, DayModal, EntryForm,
                     RevisionPane, SettingsPanel, SearchOverlay
```

Dates are stored as `yyyy-MM-dd` strings throughout, never `Date` objects, so
nothing shifts across timezones or DST.

## Keyboard

| Key | Action |
| --- | --- |
| `←` `→` | previous / next month |
| `T` | open today |
| `/` | search |
| `Esc` | close a dialog |
