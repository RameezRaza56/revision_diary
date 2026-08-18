import { useEffect, useMemo, useState } from 'react'
import type { Entry, Revision } from '../db/schema'
import { useDiary } from '../db/DiaryContext'
import { deleteEntry } from '../db/storage'
import {
  allSubjects,
  entriesByIds,
  entriesOn,
  overdueRevisions,
  revisionsForEntries,
  revisionsOn,
} from '../lib/select'
import { addDaysKey, prettyDate, shortDate, todayKey } from '../lib/dates'
import { penStyle, subjectPen } from '../lib/colors'
import EntryForm from './EntryForm'
import RevisionPane from './RevisionPane'
import { ChevronLeft, ChevronRight, Close, Flourish, Pencil, Quill, Repeat, Trash } from './Icons'

interface Props {
  dateKey: string
  onGoTo: (dateKey: string) => void
  onClose: () => void
}

export default function DayModal({ dateKey, onGoTo, onClose }: Props) {
  const { entries, revisions } = useDiary()
  const [tab, setTab] = useState<'entries' | 'revisions'>('entries')
  const [editing, setEditing] = useState<Entry | null>(null)
  const isToday = dateKey === todayKey()

  const goBack = () => onGoTo(addDaysKey(dateKey, -1))
  const goForward = () => onGoTo(addDaysKey(dateKey, 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      // Arrows turn the page, but not while she's mid-sentence in a field.
      const typing =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (typing) return
      if (e.key === 'ArrowLeft') onGoTo(addDaysKey(dateKey, -1))
      else if (e.key === 'ArrowRight') onGoTo(addDaysKey(dateKey, 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onGoTo, dateKey])

  useEffect(() => setEditing(null), [dateKey])

  const data = useMemo(() => {
    const dayEntries = entriesOn(entries, dateKey)
    const dayRevisions = revisionsOn(revisions, dateKey)
    const overdue = isToday ? overdueRevisions(revisions) : []
    // Entries logged today plus whatever the day's revisions point back to — the
    // two sets barely overlap, and both panes need the full revision timeline.
    const ids = [
      ...new Set([
        ...dayEntries.map((e) => e.id),
        ...[...dayRevisions, ...overdue].map((r) => r.entryId),
      ]),
    ]
    return {
      entries: dayEntries,
      revisions: dayRevisions,
      overdue,
      entryMap: entriesByIds(entries, ids),
      totals: revisionsForEntries(revisions, ids),
      subjects: allSubjects(entries),
    }
  }, [entries, revisions, dateKey, isToday])

  const dueCount =
    data.revisions.filter((r) => r.status === 'pending').length + data.overdue.length

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/75 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Diary page for ${prettyDate(dateKey)}`}
        className="paper animate-pop-in relative flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[4px_22px_22px_4px] border border-line shadow-float"
      >
        {/* Decorative only — the header controls are kept clear of it below. */}
        <div className="ribbon right-5 top-0 z-10" aria-hidden />

        {/* ------------------------------------------------------- page head */}
        <header className="relative flex shrink-0 items-start justify-between gap-3 border-b border-line-soft px-5 py-3 sm:px-8 sm:py-4">
          <div className="min-w-0">
            <p className="text-sm text-ink-faint">{isToday ? 'Today’s page' : 'From my diary'}</p>
            <div className="flex items-baseline gap-1.5">
              <PageTurn label="The day before" onClick={goBack}>
                <ChevronLeft className="h-5 w-5" />
              </PageTurn>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">{prettyDate(dateKey)}</h2>
              <PageTurn label="The day after" onClick={goForward}>
                <ChevronRight className="h-5 w-5" />
              </PageTurn>
            </div>
            <Flourish className="mt-0.5 h-2.5 w-44 text-ink-faint" />
          </div>
          {/* mr clears the ribbon, which hangs at right-5 and is 1.6rem wide */}
          <div className="mr-11 flex shrink-0 items-center gap-2">
            {!isToday && (
              <button type="button" onClick={() => onGoTo(todayKey())} className="btn-ink text-sm">
                Go to today
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close this page"
              title="Close this page"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition hover:rotate-90 hover:text-danger"
            >
              <Close className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* tab switcher — only needed when the two pages can't sit side by side */}
        <div className="flex shrink-0 gap-2 border-b border-line-soft px-4 py-2 lg:hidden">
          <TabButton active={tab === 'entries'} onClick={() => setTab('entries')}>
            <Quill className="h-4 w-4" /> Studied ({data.entries.length})
          </TabButton>
          <TabButton active={tab === 'revisions'} onClick={() => setTab('revisions')}>
            <Repeat className="h-4 w-4" /> To revisit ({dueCount})
          </TabButton>
        </div>

        <div className="spread grid min-h-0 flex-1 lg:grid-cols-2">
          {/* ------------------------------------------------- left-hand page */}
          <section
            className={`margin-rule min-h-0 overflow-y-auto py-4 pl-8 pr-4 sm:pl-16 sm:pr-6 ${tab === 'entries' ? '' : 'hidden'} lg:block`}
          >
            <PaneTitle icon={<Quill className="h-5 w-5" />} title="What I studied" />
            <div className="mt-3 grid gap-4">
              <EntryForm
                dateKey={dateKey}
                subjects={data.subjects}
                editing={editing}
                onDone={() => setEditing(null)}
              />
              <EntryList entries={data.entries} totals={data.totals} onEdit={setEditing} />
            </div>
          </section>

          {/* ------------------------------------------------ right-hand page */}
          <section
            className={`min-h-0 overflow-y-auto bg-surface-2/40 px-5 py-4 sm:px-8 ${tab === 'revisions' ? '' : 'hidden'} lg:block`}
          >
            <PaneTitle
              icon={<Repeat className="h-5 w-5" />}
              title="To revisit"
              note="pencilled in for me"
            />
            <div className="mt-3">
              <RevisionPane
                dueToday={data.revisions}
                overdue={data.overdue}
                entries={data.entryMap}
                totals={data.totals}
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

/** Turning to the previous or next day, without leaving the page. */
function PageTurn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint transition hover:-rotate-3 hover:bg-accent-soft/50 hover:text-accent"
    >
      {children}
    </button>
  )
}

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
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      {note && <span className="text-sm text-ink-faint">— {note}</span>}
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
        'hand-pill flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-base transition',
        active
          ? 'border border-accent/60 bg-accent-soft/70 text-accent-ink'
          : 'border border-transparent text-ink-soft hover:text-ink',
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
  totals: Map<string, Revision[]>
  onEdit: (e: Entry) => void
}) {
  const { revisions } = useDiary()
  const [confirming, setConfirming] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-lg text-ink-faint">Nothing written on this page yet.</p>
    )
  }

  return (
    <ul className="grid gap-3">
      {entries.map((e) => {
        const plan = totals.get(e.id)
        return (
          <li key={e.id} className="relative pl-4">
            {/* the pen this subject is always written in */}
            <span
              className="absolute inset-y-1 left-0 w-[3px] rounded-full"
              style={{ background: subjectPen(e.subject) }}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg leading-snug text-ink">{e.topic}</p>
                {e.subject && (
                  <span
                    className="hand-pill mt-0.5 inline-block border px-2 py-0.5 text-sm"
                    style={penStyle(e.subject)}
                  >
                    {e.subject}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton label="Rewrite this" onClick={() => onEdit(e)}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton label="Cross this out" danger onClick={() => setConfirming(e.id)}>
                  <Trash className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            {e.notes && (
              <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-ink-soft">
                {e.notes}
              </p>
            )}

            {plan && plan.length > 0 && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-faint">
                <span>coming back on</span>
                {plan.map((r, i) => (
                  <span
                    key={r.id}
                    className={
                      r.status === 'done' ? 'text-done line-through decoration-2' : 'text-ink-soft'
                    }
                  >
                    {shortDate(r.dueDate)}
                    {i < plan.length - 1 && <span className="text-ink-faint"> ·</span>}
                  </span>
                ))}
              </p>
            )}

            {confirming === e.id && (
              <div className="hand-edge mt-2 flex flex-wrap items-center gap-2 border border-danger/40 bg-danger-soft/60 px-3 py-2 text-base">
                <span className="text-danger">Tear this out, revisions and all?</span>
                <button
                  type="button"
                  onClick={() => {
                    deleteEntry(e.id, revisions)
                    setConfirming(null)
                  }}
                  className="btn-ink border-danger py-0.5 text-danger hover:border-danger hover:bg-danger-soft hover:text-danger"
                >
                  Tear out
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="text-ink-soft"
                >
                  keep it
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
        'grid h-8 w-8 place-items-center rounded-full text-ink-faint transition hover:-rotate-6',
        danger ? 'hover:text-danger' : 'hover:text-accent',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
