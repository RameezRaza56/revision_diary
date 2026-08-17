import type { Entry, Revision } from '../db/schema'
import { todayKey } from './dates'

/**
 * The whole diary is held in memory — a few thousand short text records at
 * most, and Firestore serves it from the local cache — so what used to be
 * indexed queries are now plain filters. Nothing here touches the network,
 * which is what keeps switching months instant and offline behaviour honest.
 */

export const entriesOn = (entries: Entry[], dateKey: string): Entry[] =>
  entries.filter((e) => e.studyDate === dateKey)

export const entriesBetween = (entries: Entry[], from: string, to: string): Entry[] =>
  entries.filter((e) => e.studyDate >= from && e.studyDate <= to)

export const revisionsOn = (revisions: Revision[], dateKey: string): Revision[] =>
  revisions.filter((r) => r.dueDate === dateKey)

export const revisionsBetween = (revisions: Revision[], from: string, to: string): Revision[] =>
  revisions.filter((r) => r.dueDate >= from && r.dueDate <= to)

/** Pending revisions whose due date has already passed. */
export const overdueRevisions = (revisions: Revision[]): Revision[] =>
  revisions.filter((r) => r.status === 'pending' && r.dueDate < todayKey())

export function entriesByIds(entries: Entry[], ids: string[]): Map<string, Entry> {
  const wanted = new Set(ids)
  const map = new Map<string, Entry>()
  for (const e of entries) if (wanted.has(e.id)) map.set(e.id, e)
  return map
}

/** All revisions for a set of entries, grouped by entry and ordered by index. */
export function revisionsForEntries(
  revisions: Revision[],
  ids: string[],
): Map<string, Revision[]> {
  const wanted = new Set(ids)
  const map = new Map<string, Revision[]>()
  for (const r of revisions) {
    if (!wanted.has(r.entryId)) continue
    const list = map.get(r.entryId)
    if (list) list.push(r)
    else map.set(r.entryId, [r])
  }
  map.forEach((list) => list.sort((a, b) => a.index - b.index))
  return map
}

export function allSubjects(entries: Entry[]): string[] {
  const set = new Set<string>()
  entries.forEach((e) => e.subject && set.add(e.subject))
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function searchEntries(entries: Entry[], query: string): Entry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return entries
    .filter((e) => `${e.topic} ${e.subject} ${e.notes}`.toLowerCase().includes(q))
    .sort((a, b) => b.studyDate.localeCompare(a.studyDate))
    .slice(0, 50)
}
