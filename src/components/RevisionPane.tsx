import { useState } from 'react'
import type { Entry, Revision } from '../db/schema'
import { rescheduleRevision, setRevisionStatus } from '../db/storage'
import { subjectColor } from '../lib/colors'
import { addDaysKey, shortDate, daysBetweenKeys, todayKey } from '../lib/dates'
import { Check, Repeat, Alert } from './Icons'

interface Props {
  dueToday: Revision[]
  overdue: Revision[]
  entries: Map<string, Entry>
  totals: Map<string, Revision[]>
  isToday: boolean
}

export default function RevisionPane({ dueToday, overdue, entries, totals, isToday }: Props) {
  const pending = dueToday.filter((r) => r.status === 'pending')
  const settled = dueToday.filter((r) => r.status !== 'pending')

  const nothing = pending.length + settled.length + overdue.length === 0

  return (
    <div className="grid gap-4">
      {isToday && overdue.length > 0 && (
        <Section
          title="Overdue"
          tone="danger"
          count={overdue.length}
          hint="Carried over from earlier days — tick them off whenever you catch up."
        >
          {overdue.map((r) => (
            <RevisionRow
              key={r.id}
              revision={r}
              entry={entries.get(r.entryId)}
              total={totals.get(r.entryId)?.length ?? 0}
              overdue
            />
          ))}
        </Section>
      )}

      {pending.length > 0 && (
        <Section title={isToday ? 'Due today' : 'Due this day'} tone="accent" count={pending.length}>
          {pending.map((r) => (
            <RevisionRow
              key={r.id}
              revision={r}
              entry={entries.get(r.entryId)}
              total={totals.get(r.entryId)?.length ?? 0}
            />
          ))}
        </Section>
      )}

      {settled.length > 0 && (
        <Section title="Finished" tone="done" count={settled.length}>
          {settled.map((r) => (
            <RevisionRow
              key={r.id}
              revision={r}
              entry={entries.get(r.entryId)}
              total={totals.get(r.entryId)?.length ?? 0}
            />
          ))}
        </Section>
      )}

      {nothing && (
        <div className="rounded-2xl border border-dashed border-line bg-surface-2/40 px-4 py-10 text-center">
          <Repeat className="mx-auto mb-2 h-7 w-7 text-ink-faint" />
          <p className="text-sm font-medium text-ink-soft">Nothing to revise on this day.</p>
          <p className="mt-1 text-xs text-ink-faint">
            Add a topic on the left and its revisions will appear here automatically.
          </p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ section */

const TONES = {
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-accent-ink',
  done: 'bg-done-soft text-done',
} as const

function Section({
  title,
  tone,
  count,
  hint,
  children,
}: {
  title: string
  tone: keyof typeof TONES
  count: number
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-2">
        {tone === 'danger' && <Alert className="h-4 w-4 text-danger" />}
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">{title}</h4>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONES[tone]}`}>
          {count}
        </span>
      </div>
      {hint && <p className="-mt-1 text-xs text-ink-faint">{hint}</p>}
      <div className="grid gap-2">{children}</div>
    </section>
  )
}

/* ---------------------------------------------------------------------- row */

function RevisionRow({
  revision,
  entry,
  total,
  overdue = false,
}: {
  revision: Revision
  entry: Entry | undefined
  total: number
  overdue?: boolean
}) {
  const [rating, setRating] = useState(false)
  if (!entry) return null

  const c = subjectColor(entry.subject)
  const isDone = revision.status === 'done'
  const isSkipped = revision.status === 'skipped'
  const lateBy = overdue ? daysBetweenKeys(revision.dueDate, todayKey()) : 0

  async function complete(confidence: number | null) {
    await setRevisionStatus(revision.id, 'done', confidence)
    setRating(false)
  }

  return (
    <div
      className={[
        'rounded-xl border p-2.5 transition',
        isDone
          ? 'border-line-soft bg-done-soft/40'
          : overdue
            ? 'border-danger/40 bg-danger-soft/30'
            : 'border-line-soft bg-surface',
        isSkipped ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => (isDone ? setRevisionStatus(revision.id, 'pending') : setRating(true))}
          aria-label={isDone ? 'Mark as not revised' : 'Mark as revised'}
          className={[
            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition',
            isDone ? 'border-done bg-done text-white' : 'border-line hover:border-accent',
          ].join(' ')}
        >
          {isDone && <Check className="h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-semibold ${isDone ? 'text-ink-soft line-through' : 'text-ink'}`}
          >
            {entry.topic}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
            {entry.subject && (
              <span
                className="rounded px-1.5 py-0.5 font-semibold"
                style={{ background: c.chipBg, color: c.chipInk }}
              >
                {entry.subject}
              </span>
            )}
            <span>
              Revision {revision.index}
              {total ? ` of ${total}` : ''}
            </span>
            <span aria-hidden>·</span>
            <span>studied {shortDate(entry.studyDate)}</span>
            {overdue && (
              <span className="font-semibold text-danger">
                · {lateBy} day{lateBy === 1 ? '' : 's'} late
              </span>
            )}
            {isSkipped && <span className="font-semibold">· skipped</span>}
          </div>

          {entry.notes && !isDone && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
              {entry.notes}
            </p>
          )}

          {rating && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-2 p-2">
              <span className="mr-1 text-[11px] font-semibold text-ink-soft">
                How well did it stick?
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => complete(n)}
                  className="h-6 w-6 rounded-md border border-line text-xs font-bold text-ink-soft transition hover:border-accent hover:bg-accent hover:text-white"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => complete(null)}
                className="ml-1 text-[11px] font-medium text-ink-faint underline underline-offset-2 hover:text-ink"
              >
                skip rating
              </button>
            </div>
          )}

          {!isDone && !rating && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <SmallButton onClick={() => rescheduleRevision(revision.id, addDaysKey(todayKey(), 1))}>
                Tomorrow
              </SmallButton>
              <SmallButton onClick={() => rescheduleRevision(revision.id, addDaysKey(todayKey(), 3))}>
                +3 days
              </SmallButton>
              <SmallButton onClick={() => setRevisionStatus(revision.id, 'skipped')}>
                Skip
              </SmallButton>
            </div>
          )}

          {isDone && revision.confidence != null && (
            <p className="mt-1.5 text-[11px] font-medium text-done">
              Confidence {revision.confidence}/5
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-ink-soft transition hover:border-accent hover:text-ink"
    >
      {children}
    </button>
  )
}
