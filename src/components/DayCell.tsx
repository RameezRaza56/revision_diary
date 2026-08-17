import type { Entry, Revision } from '../db/schema'
import { subjectPen } from '../lib/colors'
import type { GridDay } from '../lib/dates'

interface Props {
  day: GridDay
  index: number
  isToday: boolean
  isPast: boolean
  entries: Entry[]
  revisions: Revision[]
  overdue: number
  onOpen: (key: string) => void
}

export default function DayCell({
  day,
  index,
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
        'group relative flex min-h-0 cursor-pointer flex-col gap-1 overflow-hidden p-1.5 text-left transition sm:p-2',
        index % 2 ? 'hand-edge' : 'hand-edge-alt',
        'hover:-translate-y-0.5 hover:-rotate-[0.5deg] hover:shadow-card focus-visible:-translate-y-0.5',
        day.inMonth
          ? 'border border-line-soft bg-surface-2/40 hover:bg-surface-2/70'
          : 'border border-transparent opacity-45',
        isPast && day.inMonth ? 'opacity-80' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={[
            'font-display text-xl leading-none',
            isToday ? 'ringed ml-1 mt-1 text-today' : '',
            !isToday && day.inMonth ? 'text-ink' : '',
            !day.inMonth ? 'text-ink-faint' : '',
          ].join(' ')}
        >
          {day.dayOfMonth}
        </span>

        <span className="flex flex-col items-end gap-0.5 pt-0.5 text-right leading-tight">
          {overdue > 0 && (
            <span className="text-xs text-danger">{overdue} late</span>
          )}
          {pending.length > 0 && (
            <span className="text-xs text-accent">
              {pending.length} to revise
            </span>
          )}
          {done.length > 0 && pending.length === 0 && (
            <span className="text-xs text-done">revised ✓</span>
          )}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {shown.map((e) => (
          <span
            key={e.id}
            className="flex items-center gap-1.5 truncate text-xs leading-[1.3] text-ink-soft"
            title={`${e.subject ? e.subject + ' — ' : ''}${e.topic}`}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: subjectPen(e.subject) }}
            />
            <span className="truncate">{e.topic}</span>
          </span>
        ))}
        {extra > 0 && (
          <span className="pl-3 text-xs leading-[1.3] text-ink-faint">
            …and {extra} more
          </span>
        )}
      </div>

      {day.inMonth && entries.length === 0 && pending.length === 0 && (
        <span className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-xs text-ink-faint opacity-0 transition group-hover:opacity-100">
          write something
        </span>
      )}
    </button>
  )
}
