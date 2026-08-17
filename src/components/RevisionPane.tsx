import { useState } from 'react'
import type { Entry, Revision } from '../db/schema'
import { setRevisionStatus } from '../db/storage'
import { penStyle } from '../lib/colors'
import { shortDate, daysBetweenKeys, todayKey } from '../lib/dates'
import { Check, Sprig } from './Icons'

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
    <div className="grid gap-5">
      {isToday && overdue.length > 0 && (
        <Section
          title="Slipped past me"
          tone="danger"
          count={overdue.length}
          hint="carried over from earlier pages — tick them off whenever you catch up"
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
        <Section
          title={isToday ? 'For today' : 'For this day'}
          tone="accent"
          count={pending.length}
        >
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
        <Section title="Done and dusted" tone="done" count={settled.length}>
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
        <div className="px-4 py-10 text-center">
          <Sprig className="mx-auto mb-1 h-8 w-8 text-ink-faint opacity-60" />
          <p className="font-display text-xl text-ink-soft">Nothing to revisit today.</p>
          <p className="mt-0.5 text-base text-ink-faint">
            Write a topic on the other page and it will find its way here.
          </p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ section */

const TONES = {
  danger: 'text-danger',
  accent: 'text-accent',
  done: 'text-done',
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
      <div className="flex items-baseline gap-2">
        <h4 className={`font-display text-xl ${TONES[tone]}`}>{title}</h4>
        <span className="text-base text-ink-faint">({count})</span>
      </div>
      {hint && <p className="-mt-1.5 text-sm text-ink-faint">{hint}</p>}
      <div className="grid gap-2.5">{children}</div>
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

  const isDone = revision.status === 'done'
  const isSkipped = revision.status === 'skipped'
  const lateBy = overdue ? daysBetweenKeys(revision.dueDate, todayKey()) : 0

  async function complete(confidence: number | null) {
    await setRevisionStatus(revision, 'done', confidence)
    setRating(false)
  }

  return (
    <div className={`flex items-start gap-2.5 ${isSkipped ? 'opacity-55' : ''}`}>
      <button
        type="button"
        onClick={() => (isDone ? setRevisionStatus(revision, 'pending') : setRating(true))}
        aria-label={isDone ? 'Mark as not revised' : 'Mark as revised'}
        className={[
          'hand-edge mt-1 grid h-5 w-5 shrink-0 place-items-center border-[1.5px] transition',
          isDone
            ? 'border-done text-done'
            : 'border-ink-faint text-transparent hover:-rotate-6 hover:border-accent',
        ].join(' ')}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-lg leading-snug ${
            isDone ? 'text-ink-faint line-through decoration-done decoration-2' : 'text-ink'
          }`}
        >
          {entry.topic}
        </p>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-faint">
          {entry.subject && (
            <span
              className="hand-pill border px-1.5 py-px"
              style={penStyle(entry.subject)}
            >
              {entry.subject}
            </span>
          )}
          <span>
            revision {revision.index}
            {total ? ` of ${total}` : ''}
          </span>
          <span aria-hidden>·</span>
          <span>studied {shortDate(entry.studyDate)}</span>
          {overdue && (
            <span className="text-danger">
              · {lateBy} day{lateBy === 1 ? '' : 's'} late
            </span>
          )}
          {isSkipped && <span>· skipped</span>}
        </div>

        {entry.notes && !isDone && (
          <p className="mt-1 line-clamp-2 text-base leading-relaxed text-ink-soft">{entry.notes}</p>
        )}

        {rating && (
          <div className="hand-edge mt-1.5 flex flex-wrap items-center gap-1.5 border border-line-soft bg-surface-2/60 px-2.5 py-1.5">
            <span className="text-base text-ink-soft">how well did it stick?</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => complete(n)}
                className="h-7 w-7 rounded-full border border-line text-base text-ink-soft transition hover:-rotate-6 hover:border-accent hover:bg-accent hover:text-surface"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => complete(null)}
              className="ml-1 text-sm text-ink-faint transition hover:text-ink"
            >
              just tick it
            </button>
          </div>
        )}

        {isDone && revision.confidence != null && (
          <p className="mt-0.5 text-sm text-done">
            felt {revision.confidence} out of 5
          </p>
        )}
      </div>
    </div>
  )
}
