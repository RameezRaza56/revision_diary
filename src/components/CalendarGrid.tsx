import type { Entry, Revision } from '../db/schema'
import { monthGrid, todayKey, WEEKDAYS } from '../lib/dates'
import DayCell from './DayCell'

export interface DayBucket {
  entries: Entry[]
  revisions: Revision[]
}

interface Props {
  cursor: Date
  buckets: Map<string, DayBucket>
  overdueCount: number
  onOpen: (key: string) => void
}

export default function CalendarGrid({ cursor, buckets, overdueCount, onOpen }: Props) {
  const days = monthGrid(cursor)
  const today = todayKey()
  const empty: DayBucket = { entries: [], revisions: [] }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid grid-cols-7 gap-2 px-0.5">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint"
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}</span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-2">
        {days.map((day) => (
          <DayCell
            key={day.key}
            day={day}
            isToday={day.key === today}
            isPast={day.key < today}
            entries={(buckets.get(day.key) ?? empty).entries}
            revisions={(buckets.get(day.key) ?? empty).revisions}
            overdue={day.key === today ? overdueCount : 0}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}
