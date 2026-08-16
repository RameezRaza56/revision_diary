import { getDay } from 'date-fns'
import type { Anchor, Revision, Settings } from '../db/schema'
import { addDaysKey, fromKey } from './dates'

export interface PlannedRevision {
  index: number
  offsetDays: number
  dueDate: string
}

/** Push Saturday/Sunday forward to the following Monday. */
function nudgeOffWeekend(key: string): string {
  const day = getDay(fromKey(key))
  if (day === 6) return addDaysKey(key, 2)
  if (day === 0) return addDaysKey(key, 1)
  return key
}

/**
 * Turn a study date + interval list into concrete due dates.
 *
 * anchor 'studyDate'      — every interval counts from the day she studied it,
 *                           so [7, 30, 60] lands on day 7, 30 and 60.
 * anchor 'previousRevision' — intervals stack, so [7, 30, 60] lands on day 7,
 *                           37 and 97.
 */
export function planRevisions(
  studyDate: string,
  schedule: number[],
  anchor: Anchor,
  skipWeekends: boolean,
): PlannedRevision[] {
  const out: PlannedRevision[] = []
  let cursor = studyDate

  schedule.forEach((interval, i) => {
    let due: string
    if (anchor === 'studyDate') {
      due = addDaysKey(studyDate, interval)
    } else {
      due = addDaysKey(cursor, interval)
      cursor = due
    }
    if (skipWeekends) due = nudgeOffWeekend(due)
    out.push({ index: i + 1, offsetDays: interval, dueDate: due })
  })

  // In studyDate mode a shorter interval listed later would sort out of order;
  // keep the calendar chronological so "1st revision" always precedes "2nd".
  out.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return out.map((r, i) => ({ ...r, index: i + 1 }))
}

export function buildRevisions(entryId: string, studyDate: string, settings: Settings): Revision[] {
  return planRevisions(studyDate, settings.schedule, settings.anchor, settings.skipWeekends).map(
    (p) => ({
      id: crypto.randomUUID(),
      entryId,
      dueDate: p.dueDate,
      index: p.index,
      offsetDays: p.offsetDays,
      status: 'pending' as const,
      completedDate: null,
      confidence: null,
    }),
  )
}

/**
 * Recompute an entry's revisions after the pattern changed.
 *
 * Revisions she has already done (or deliberately skipped) are history: they
 * never move, and they pin the timeline. Only plan dates that fall *after* the
 * last one she settled are still up for grabs, so a new pattern can't schedule
 * a revision earlier than work she has already finished, or double-book a day
 * she has already ticked off.
 */
export function reconcileRevisions(
  entryId: string,
  studyDate: string,
  existing: Revision[],
  settings: Settings,
): { keep: Revision[]; remove: string[]; add: Revision[] } {
  const settled = existing.filter((r) => r.status !== 'pending')
  const pending = existing
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const planned = planRevisions(
    studyDate,
    settings.schedule,
    settings.anchor,
    settings.skipWeekends,
  )

  const lastSettled = settled.reduce<string | null>(
    (max, r) => (max === null || r.dueDate > max ? r.dueDate : max),
    null,
  )
  const open = lastSettled === null ? planned : planned.filter((p) => p.dueDate > lastSettled)

  // Re-lay the open plan over the pending rows, reusing their ids so ratings and
  // manual reschedules keep their identity rather than flickering as new rows.
  const keep: Revision[] = []
  const add: Revision[] = []
  const spare = [...pending]

  for (const p of open) {
    const reuse = spare.shift()
    if (reuse) keep.push({ ...reuse, dueDate: p.dueDate, offsetDays: p.offsetDays })
    else
      add.push({
        id: crypto.randomUUID(),
        entryId,
        dueDate: p.dueDate,
        index: 0,
        offsetDays: p.offsetDays,
        status: 'pending',
        completedDate: null,
        confidence: null,
      })
  }

  // Renumber chronologically across the whole entry so "Revision 2 of 4" reads
  // correctly no matter how the pattern was edited.
  const ordered = [...settled, ...keep, ...add].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  ordered.forEach((r, i) => {
    r.index = i + 1
  })

  return { keep: [...settled, ...keep], remove: spare.map((r) => r.id), add }
}
