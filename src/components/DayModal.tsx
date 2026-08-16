import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Entry, Revision, Settings } from '../db/schema'
import {
  allSubjects,
  deleteEntry,
  entriesByIds,
  entriesInRange,
  overdueRevisions,
  revisionsForEntries,
  revisionsInRange,
} from '../db/storage'
import { prettyDate, shortDate, todayKey } from '../lib/dates'
import { subjectColor } from '../lib/colors'
import EntryForm from './EntryForm'
import RevisionPane from './RevisionPane'
import { Book, Close, Pencil, Repeat, Trash } from './Icons'

interface Props {
  dateKey: string
  settings: Settings
  onClose: () => void
}

export default function DayModal({ dateKey, settings, onClose }: Props) {
  const [tab, setTab] = useState<'entries' | 'revisions'>('entries')
  const [editing, setEditing] = useState<Entry | null>(null)
  const isToday = dateKey === todayKey()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => setEditing(null), [dateKey])

  const data = useLiveQuery(async () => {
    const [entries, revisions, subjects] = await Promise.all([
      entriesInRange(dateKey, dateKey),
      revisionsInRange(dateKey, dateKey),
      allSubjects(),
    ])
    const overdue = isToday ? await overdueRevisions() : []
    // Entries logged today plus whatever the day's revisions point back to — the
    // two sets barely overlap, and both panes need the full revision timeline.
    const ids = [
      ...new Set([...entries.map((e) => e.id), ...[...revisions, ...overdue].map((r) => r.entryId)]),
    ]
    const [entryMap, totals] = await Promise.all([entriesByIds(ids), revisionsForEntries(ids)])
    return { entries, revisions, overdue, entryMap, totals, subjects }
  }, [dateKey, isToday])

  const dueCount =
    (data?.revisions.filter((r) => r.status === 'pending').length ?? 0) +
    (data?.overdue.length ?? 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Diary for ${prettyDate(dateKey)}`}
        className="animate-pop-in flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-float"
      >
        {/* header */}
        <header className="flex items-start justify-between gap-3 border-b border-line-soft bg-surface-2/70 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              {isToday ? 'Today' : 'Diary page'}
            </p>
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {prettyDate(dateKey)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-line p-2 text-ink-soft transition hover:bg-surface hover:text-ink"
          >
            <Close className="h-4 w-4" />
          </button>
        </header>

        {/* tab switcher — only needed when the two panes can't sit side by side */}
        <div className="flex gap-1 border-b border-line-soft px-4 py-2 lg:hidden">
          <TabButton active={tab === 'entries'} onClick={() => setTab('entries')}>
            <Book className="h-4 w-4" /> Studied ({data?.entries.length ?? 0})
          </TabButton>
          <TabButton active={tab === 'revisions'} onClick={() => setTab('revisions')}>
            <Repeat className="h-4 w-4" /> Revisions ({dueCount})
          </TabButton>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-2 lg:divide-x lg:divide-line-soft">
          {/* ------------------------------------------------ entries pane */}
          <section
            className={`min-h-0 overflow-y-auto p-5 ${tab === 'entries' ? '' : 'hidden'} lg:block`}
          >
            <PaneTitle icon={<Book className="h-4 w-4" />} title="What I studied" />
            <div className="mt-3 grid gap-3">
              <EntryForm
                dateKey={dateKey}
                settings={settings}
                subjects={data?.subjects ?? []}
                editing={editing}
                onDone={() => setEditing(null)}
              />
              <EntryList
                entries={data?.entries ?? []}
                totals={data?.totals}
                onEdit={setEditing}
              />
            </div>
          </section>

          {/* ---------------------------------------------- revisions pane */}
          <section
            className={`min-h-0 overflow-y-auto bg-surface-2/25 p-5 ${tab === 'revisions' ? '' : 'hidden'} lg:block`}
          >
            <PaneTitle
              icon={<Repeat className="h-4 w-4" />}
              title="Revisions due"
              note="Filled in automatically"
            />
            <div className="mt-3">
              <RevisionPane
                dueToday={data?.revisions ?? []}
                overdue={data?.overdue ?? []}
                entries={data?.entryMap ?? new Map()}
                totals={data?.totals ?? new Map()}
                isToday={isToday}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- pieces */

function PaneTitle({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode
  title: string
  note?: string
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-accent">{icon}</span>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {note && <span className="text-[11px] font-medium text-ink-faint">{note}</span>}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition',
        active ? 'bg-accent-soft text-accent-ink' : 'text-ink-soft hover:bg-surface-2',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function EntryList({
  entries,
  totals,
  onEdit,
}: {
  entries: Entry[]
  totals: Map<string, Revision[]> | undefined
  onEdit: (e: Entry) => void
}) {
  const [confirming, setConfirming] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
        Nothing logged for this day yet.
      </p>
    )
  }

  return (
    <ul className="grid gap-2">
      {entries.map((e) => {
        const c = subjectColor(e.subject)
        const plan = totals?.get(e.id)
        return (
          <li
            key={e.id}
            className="rounded-xl border border-line-soft bg-surface p-3 shadow-card"
            style={{ borderLeft: `3px solid ${c.dot}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{e.topic}</p>
                {e.subject && (
                  <span
                    className="mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: c.chipBg, color: c.chipInk }}
                  >
                    {e.subject}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton label="Edit" onClick={() => onEdit(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Delete" danger onClick={() => setConfirming(e.id)}>
                  <Trash className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>

            {e.notes && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{e.notes}</p>}

            {e.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-soft"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {plan && plan.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-line-soft pt-2 text-[10px] text-ink-faint">
                <span className="font-semibold uppercase tracking-wider">Revisions</span>
                {plan.map((r, i) => (
                  <span
                    key={i}
                    className={[
                      'rounded px-1.5 py-0.5 font-medium',
                      r.status === 'done'
                        ? 'bg-done-soft text-done line-through'
                        : 'bg-surface-2 text-ink-soft',
                    ].join(' ')}
                  >
                    {shortDate(r.dueDate)}
                  </span>
                ))}
              </div>
            )}

            {confirming === e.id && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-danger-soft p-2 text-xs">
                <span className="font-medium text-danger">
                  Delete this topic and all its revisions?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    deleteEntry(e.id)
                    setConfirming(null)
                  }}
                  className="rounded bg-danger px-2 py-1 font-semibold text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="font-medium text-ink-soft underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'rounded-md border border-line p-1.5 transition',
        danger ? 'text-ink-faint hover:border-danger hover:text-danger' : 'text-ink-faint hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
