import { useCallback, useEffect, useMemo, useState } from 'react'
import { addMonths } from 'date-fns'
import { signOut } from 'firebase/auth'
import { auth, firebaseConfigured } from './lib/firebase'
import { useDiary } from './db/DiaryContext'
import { saveTheme } from './db/storage'
import { describeInterval, fromKey, monthBounds, prettyDate, todayKey } from './lib/dates'
import { entriesBetween, overdueRevisions, revisionsBetween } from './lib/select'
import { applyTheme, forgetTheme, rememberTheme, SIGNED_OUT_THEME } from './lib/theme'
import CalendarGrid, { type DayBucket } from './components/CalendarGrid'
import DayModal from './components/DayModal'
import SettingsPanel from './components/SettingsPanel'
import SearchOverlay from './components/SearchOverlay'
import SignIn from './components/SignIn'
import Toolbar from './components/Toolbar'
import { SignOut } from './components/Icons'

export default function App() {
  const { user, authReady, loading, entries, revisions, settings, sync } = useDiary()

  const [cursor, setCursor] = useState(() => new Date())
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  /* --------------------------------------------------------------- theme */

  // The sign-in page is always dark. Light and dark are hers to choose only
  // once she's inside, where the setting is saved to her account.
  const theme = user ? settings.theme : SIGNED_OUT_THEME

  useEffect(() => {
    applyTheme(theme)
    // Only once her real settings have arrived — remembering the placeholder
    // would make the next cold launch flash the wrong theme.
    if (user && !loading) rememberTheme(theme)
  }, [theme, user, loading])

  const toggleTheme = useCallback(() => {
    saveTheme(settings, settings.theme === 'dark' ? 'light' : 'dark')
  }, [settings])

  /* ------------------------------------------------------------ shortcuts */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (typing || openDay || showSettings) return
      if (e.key === 'ArrowLeft') setCursor((c) => addMonths(c, -1))
      else if (e.key === 'ArrowRight') setCursor((c) => addMonths(c, 1))
      else if (e.key.toLowerCase() === 't') {
        setCursor(new Date())
        setOpenDay(todayKey())
      } else if (e.key === '/') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openDay, showSettings])

  /* ------------------------------------------------------------- buckets */

  const buckets = useMemo(() => {
    const { from, to } = monthBounds(cursor)
    const map = new Map<string, DayBucket>()
    const ensure = (key: string) => {
      let b = map.get(key)
      if (!b) {
        b = { entries: [], revisions: [] }
        map.set(key, b)
      }
      return b
    }
    entriesBetween(entries, from, to).forEach((e) => ensure(e.studyDate).entries.push(e))
    revisionsBetween(revisions, from, to).forEach((r) => ensure(r.dueDate).revisions.push(r))
    return map
  }, [cursor, entries, revisions])

  const today = todayKey()
  const overdueCount = useMemo(() => overdueRevisions(revisions).length, [revisions])
  const dueToday =
    buckets.get(today)?.revisions.filter((r) => r.status === 'pending').length ?? 0

  const scheduleSummary =
    settings.schedule.length === 0
      ? 'nothing comes back yet — open the gear to set the rhythm'
      : `everything comes back ${settings.schedule.length} times · ${settings.schedule
          .map(describeInterval)
          .join(' · ')}`

  /* ---------------------------------------------------------- gatekeeping */

  if (!firebaseConfigured) return <NeedsSetup />
  if (!authReady) return <Waiting note="Opening the diary…" />
  if (!user) return <SignIn />
  if (loading && entries.length === 0) return <Waiting note="Finding your page…" />

  /* ---------------------------------------------------------------- view */

  return (
    <div className="flex h-full justify-center p-2 sm:p-6">
      <main className="paper book margin-rule flex h-full w-full max-w-[1500px] flex-col gap-3 overflow-hidden py-4 pl-8 pr-4 sm:gap-4 sm:py-6 sm:pl-16 sm:pr-8">
        <Toolbar
          cursor={cursor}
          onShiftMonth={(d) => setCursor((c) => addMonths(c, d))}
          onToday={() => {
            setCursor(new Date())
            setOpenDay(today)
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenSearch={() => setShowSearch(true)}
          theme={settings.theme}
          onToggleTheme={toggleTheme}
          scheduleSummary={scheduleSummary}
        />

        {(dueToday > 0 || overdueCount > 0) && (
          <button
            type="button"
            onClick={() => setOpenDay(today)}
            className="hand-edge group flex flex-wrap items-baseline gap-x-2 gap-y-1 border border-line-soft bg-surface-2/50 px-4 py-2 text-left transition hover:-rotate-[0.3deg] hover:border-accent"
          >
            <span className="font-display text-xl text-ink">{prettyDate(today)}</span>
            {dueToday > 0 && (
              <span className="text-base text-accent">— {dueToday} to revisit today</span>
            )}
            {overdueCount > 0 && (
              <span className="text-base text-danger">
                {dueToday > 0 && ', '}
                {overdueCount} still waiting from before
              </span>
            )}
            <span className="ml-auto text-base text-ink-faint transition group-hover:text-accent">
              open the page →
            </span>
          </button>
        )}

        <CalendarGrid
          cursor={cursor}
          buckets={buckets}
          overdueCount={overdueCount}
          onOpen={setOpenDay}
        />

        <footer className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-ink-faint">
          <span>
            {entries.length === 0
              ? 'no entries yet'
              : `${entries.length} topic${entries.length === 1 ? '' : 's'} written in this diary`}
            <SyncNote offline={sync.offline} pending={sync.pending} />
          </span>
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                forgetTheme()
                signOut(auth)
              }}
              title="Close the diary on this device"
              className="flex items-center gap-1 transition hover:text-accent"
            >
              <SignOut className="h-4 w-4" /> sign out
            </button>
          </span>
        </footer>
      </main>

      {openDay && (
        <DayModal
          dateKey={openDay}
          onGoTo={(key) => {
            // Turning past the end of a month takes the calendar behind it along.
            setOpenDay(key)
            setCursor(fromKey(key))
          }}
          onClose={() => setOpenDay(null)}
        />
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showSearch && (
        <SearchOverlay
          onPick={(key) => {
            setCursor(new Date(key))
            setOpenDay(key)
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

/** Quiet reassurance, and only when there is something worth saying. */
function SyncNote({ offline, pending }: { offline: boolean; pending: boolean }) {
  if (!offline && !pending) return null
  return <span>{offline ? ' · offline — saved here, will sync later' : ' · syncing…'}</span>
}

function Waiting({ note }: { note: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <p className="font-display text-2xl text-ink-faint">{note}</p>
    </div>
  )
}

function NeedsSetup() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="paper book margin-rule w-full max-w-lg overflow-hidden py-8 pl-12 pr-8">
        <h1 className="font-display text-3xl text-ink">Almost there</h1>
        <p className="mt-2 text-base text-ink-soft">
          The diary needs a Firebase project before it can sync. Copy{' '}
          <code className="text-accent">.env.example</code> to{' '}
          <code className="text-accent">.env</code>, fill in the six values from your Firebase
          web app, then restart the dev server.
        </p>
        <p className="mt-2 text-sm text-ink-faint">
          The walkthrough is in the README, under “Setting up sync”.
        </p>
      </div>
    </div>
  )
}
