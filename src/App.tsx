import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths } from 'date-fns'
import { DEFAULT_SETTINGS, db } from './db/schema'
import {
  countEntries,
  entriesInRange,
  getSettings,
  overdueRevisions,
  revisionsInRange,
} from './db/storage'
import { describeInterval, monthBounds, prettyDate, todayKey } from './lib/dates'
import { backupIsStale, downloadBackup, pickAndImportBackup } from './lib/backup'
import CalendarGrid, { type DayBucket } from './components/CalendarGrid'
import DayModal from './components/DayModal'
import SettingsPanel from './components/SettingsPanel'
import SearchOverlay from './components/SearchOverlay'
import Toolbar from './components/Toolbar'
import { Alert, Close, Download, Repeat } from './components/Icons'

export default function App() {
  const [cursor, setCursor] = useState(() => new Date())
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [nagDismissed, setNagDismissed] = useState(false)

  const settings = useLiveQuery(getSettings, [], DEFAULT_SETTINGS)
  const entryCount = useLiveQuery(countEntries, [], 0)

  const month = useLiveQuery(async () => {
    const { from, to } = monthBounds(cursor)
    const [entries, revisions, overdue] = await Promise.all([
      entriesInRange(from, to),
      revisionsInRange(from, to),
      overdueRevisions(),
    ])
    return { entries, revisions, overdue }
  }, [cursor])

  /* --------------------------------------------------------------- theme */

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  }, [settings.theme])

  const toggleTheme = useCallback(async () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark'
    await db.settings.put({ ...settings, theme: next, id: 'singleton' })
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
    const map = new Map<string, DayBucket>()
    const ensure = (key: string) => {
      let b = map.get(key)
      if (!b) {
        b = { entries: [], revisions: [] }
        map.set(key, b)
      }
      return b
    }
    month?.entries.forEach((e) => ensure(e.studyDate).entries.push(e))
    month?.revisions.forEach((r) => ensure(r.dueDate).revisions.push(r))
    return map
  }, [month])

  const today = todayKey()
  const overdueCount = month?.overdue.length ?? 0
  const dueToday =
    buckets.get(today)?.revisions.filter((r) => r.status === 'pending').length ?? 0

  const scheduleSummary =
    settings.schedule.length === 0
      ? 'No revisions scheduled — click to set up'
      : `${settings.schedule.length} revisions · ${settings.schedule.map(describeInterval).join(' · ')}`

  /* -------------------------------------------------------------- backup */

  async function handleExport() {
    await downloadBackup()
    setToast('Backup saved to your Downloads folder.')
  }

  async function handleImport() {
    const replace = window.confirm(
      'Replace everything currently in the app with the backup?\n\nOK = replace   ·   Cancel = merge into what you already have',
    )
    try {
      const n = await pickAndImportBackup(replace ? 'replace' : 'merge')
      if (n !== null) setToast(`Restored ${n} topic${n === 1 ? '' : 's'}.`)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const showNag = !nagDismissed && backupIsStale(settings.lastBackupAt, entryCount)

  /* ---------------------------------------------------------------- view */

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3 p-3 sm:gap-4 sm:p-5">
      <Toolbar
        cursor={cursor}
        onShiftMonth={(d) => setCursor((c) => addMonths(c, d))}
        onToday={() => {
          setCursor(new Date())
          setOpenDay(today)
        }}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSearch={() => setShowSearch(true)}
        onExport={handleExport}
        onImport={handleImport}
        theme={settings.theme}
        onToggleTheme={toggleTheme}
        scheduleSummary={scheduleSummary}
      />

      {(dueToday > 0 || overdueCount > 0) && (
        <button
          type="button"
          onClick={() => setOpenDay(today)}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line-soft bg-surface px-4 py-3 text-left shadow-card transition hover:border-accent"
        >
          <span className="font-display text-base font-semibold text-ink">
            {prettyDate(today)}
          </span>
          {dueToday > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-ink">
              <Repeat className="h-3.5 w-3.5" />
              {dueToday} to revise today
            </span>
          )}
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
              <Alert className="h-3.5 w-3.5" />
              {overdueCount} overdue
            </span>
          )}
          <span className="ml-auto text-xs font-medium text-ink-faint">Open today →</span>
        </button>
      )}

      {showNag && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-today/50 bg-today-soft px-4 py-3">
          <Alert className="h-4 w-4 shrink-0 text-today" />
          <p className="flex-1 text-sm text-ink">
            <span className="font-semibold">Back up your work.</span> Everything lives on this
            laptop, so clearing browser data would wipe it.
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
          >
            <Download className="h-3.5 w-3.5" /> Save backup
          </button>
          <button
            type="button"
            onClick={() => setNagDismissed(true)}
            aria-label="Dismiss"
            className="rounded-md p-1 text-ink-soft hover:text-ink"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>
      )}

      <CalendarGrid
        cursor={cursor}
        buckets={buckets}
        overdueCount={overdueCount}
        onOpen={setOpenDay}
      />

      <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-faint">
        <span>
          {entryCount} topic{entryCount === 1 ? '' : 's'} logged
        </span>
        <span className="hidden sm:inline">
          ← → change month · T open today · / search · Esc close
        </span>
      </footer>

      {openDay && (
        <DayModal dateKey={openDay} settings={settings} onClose={() => setOpenDay(null)} />
      )}
      {showSettings && (
        <SettingsPanel settings={settings} onClose={() => setShowSettings(false)} />
      )}
      {showSearch && (
        <SearchOverlay
          onPick={(key) => {
            setCursor(new Date(key))
            setOpenDay(key)
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {toast && (
        <div className="animate-fade-in fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-float">
          {toast}
        </div>
      )}
    </div>
  )
}
