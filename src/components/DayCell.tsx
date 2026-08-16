import type { Entry, Revision } from '../db/schema'
import { subjectColor } from '../lib/colors'
import type { GridDay } from '../lib/dates'

interface Props {
  day: GridDay
  isToday: boolean
  isPast: boolean
  entries: Entry[]
  revisions: Revision[]
  overdue: number
  onOpen: (key: string) => void
}

export default function DayCell({
  day,
  isToday,
  isPast,
  entries,
  revisions,
  overdue,
  onOpen,
}: Props) {
  const pending = revisions.filter((r) => r.status === 'pending')
  const done = revisions.filter((r) => r.status === 'done')
  const shown = entries.slice(0, 3)
  const extra = entries.length - shown.length

  const label = `${day.date.toDateString()}${entries.length ? `, ${entries.length} topic${entries.length === 1 ? '' : 's'} studied` : ''}${pending.length ? `, ${pending.length} to revise` : ''}${overdue ? `, ${overdue} overdue` : ''}`

  return (
    <button
      type="button"
      onClick={() => onOpen(day.key)}
      aria-label={label}
      className={[
        'group relative flex min-h-0 cursor-pointer flex-col gap-1.5 overflow-hidden rounded-xl border p-2 text-left transition',
        'hover:-translate-y-0.5 hover:shadow-card focus-visible:-translate-y-0.5',
        day.inMonth
          ? 'border-line-soft bg-surface'
          : 'border-transparent bg-surface/35 text-ink-faint',
        isToday ? 'ring-2 ring-today ring-offset-2 ring-offset-bg' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={[
            'flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold tabular-nums',
            isToday
              ? 'bg-today text-bg-deep'
              : day.inMonth
                ? isPast
                  ? 'text-ink-soft'
                  : 'text-ink'
                : 'text-ink-faint',
          ].join(' ')}
        >
          {day.dayOfMonth}
        </span>

        <div className="flex flex-wrap items-center justify-end gap-1">
          {overdue > 0 && (
            <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger">
              {overdue} late
            </span>
          )}
          {pending.length > 0 && (
            <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
              {pending.length} revise
            </span>
          )}
          {done.length > 0 && pending.length === 0 && (
            <span className="rounded-full bg-done-soft px-1.5 py-0.5 text-[10px] font-bold text-done">
              done
            </span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {shown.map((e) => {
          const c = subjectColor(e.subject)
          return (
            <span
              key={e.id}
              className="flex items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              style={{ background: c.chipBg, color: c.chipInk }}
              title={`${e.subject ? e.subject + ' — ' : ''}${e.topic}`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: c.dot }}
              />
              <span className="truncate">{e.topic}</span>
            </span>
          )
        })}
        {extra > 0 && (
          <span className="px-1.5 text-[10px] font-semibold text-ink-faint">+{extra} more</span>
        )}
      </div>

      {day.inMonth && entries.length === 0 && pending.length === 0 && (
        <span className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[10px] font-medium text-ink-faint opacity-0 transition group-hover:opacity-100">
          + add topic
        </span>
      )}
    </button>
  )
}
