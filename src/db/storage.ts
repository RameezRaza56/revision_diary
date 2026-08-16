import { db, DEFAULT_SETTINGS, type Entry, type Revision, type Settings } from './schema'
import { buildRevisions, reconcileRevisions } from '../lib/schedule'
import { todayKey } from '../lib/dates'

/* ------------------------------------------------------------------ settings */

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('singleton')
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS
}

/**
 * Persist settings. When the revision pattern itself changed, `applyToExisting`
 * re-lays-out every entry's *pending* revisions; completed ones never move.
 */
export async function saveSettings(next: Settings, applyToExisting: boolean): Promise<void> {
  await db.settings.put({ ...next, id: 'singleton' })
  if (applyToExisting) await regenerateAll(next)
}

async function regenerateAll(settings: Settings): Promise<void> {
  const entries = await db.entries.toArray()
  await db.transaction('rw', db.entries, db.revisions, async () => {
    for (const entry of entries) {
      const existing = await db.revisions.where('entryId').equals(entry.id).toArray()
      const { keep, remove, add } = reconcileRevisions(entry.id, entry.studyDate, existing, settings)
      if (remove.length) await db.revisions.bulkDelete(remove)
      if (keep.length) await db.revisions.bulkPut(keep)
      if (add.length) await db.revisions.bulkAdd(add)
    }
  })
}

/* ------------------------------------------------------------------- entries */

export interface EntryDraft {
  studyDate: string
  subject: string
  topic: string
  notes: string
  tags: string[]
}

export async function addEntry(draft: EntryDraft): Promise<string> {
  const settings = await getSettings()
  const now = Date.now()
  const entry: Entry = { id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now }
  await db.transaction('rw', db.entries, db.revisions, async () => {
    await db.entries.add(entry)
    await db.revisions.bulkAdd(buildRevisions(entry.id, entry.studyDate, settings))
  })
  return entry.id
}

export async function updateEntry(id: string, patch: Partial<EntryDraft>): Promise<void> {
  const settings = await getSettings()
  await db.transaction('rw', db.entries, db.revisions, async () => {
    const current = await db.entries.get(id)
    if (!current) return
    const next: Entry = { ...current, ...patch, updatedAt: Date.now() }
    await db.entries.put(next)

    // Moving the study date invalidates every date downstream of it.
    if (patch.studyDate && patch.studyDate !== current.studyDate) {
      const existing = await db.revisions.where('entryId').equals(id).toArray()
      const { keep, remove, add } = reconcileRevisions(id, next.studyDate, existing, settings)
      if (remove.length) await db.revisions.bulkDelete(remove)
      if (keep.length) await db.revisions.bulkPut(keep)
      if (add.length) await db.revisions.bulkAdd(add)
    }
  })
}

export async function deleteEntry(id: string): Promise<void> {
  await db.transaction('rw', db.entries, db.revisions, async () => {
    await db.revisions.where('entryId').equals(id).delete()
    await db.entries.delete(id)
  })
}

/* ----------------------------------------------------------------- revisions */

export async function setRevisionStatus(
  id: string,
  status: Revision['status'],
  confidence: number | null = null,
): Promise<void> {
  await db.revisions.update(id, {
    status,
    completedDate: status === 'pending' ? null : todayKey(),
    confidence: status === 'done' ? confidence : null,
  })
}

/** Push a single revision to a different day without disturbing the others. */
export async function rescheduleRevision(id: string, dueDate: string): Promise<void> {
  await db.revisions.update(id, { dueDate })
}

/* ------------------------------------------------------------------- queries */

export async function entriesInRange(from: string, to: string): Promise<Entry[]> {
  return db.entries.where('studyDate').between(from, to, true, true).toArray()
}

export async function revisionsInRange(from: string, to: string): Promise<Revision[]> {
  return db.revisions.where('dueDate').between(from, to, true, true).toArray()
}

/** Pending revisions whose due date has already passed. */
export async function overdueRevisions(): Promise<Revision[]> {
  const today = todayKey()
  return db.revisions
    .where('[status+dueDate]')
    .between(['pending', ''], ['pending', today], true, false)
    .toArray()
}

export async function entriesByIds(ids: string[]): Promise<Map<string, Entry>> {
  if (ids.length === 0) return new Map()
  const rows = await db.entries.bulkGet(ids)
  const map = new Map<string, Entry>()
  rows.forEach((r) => r && map.set(r.id, r))
  return map
}

export async function revisionsForEntry(entryId: string): Promise<Revision[]> {
  const rows = await db.revisions.where('entryId').equals(entryId).toArray()
  return rows.sort((a, b) => a.index - b.index)
}

/** All revisions for a set of entries, grouped by entry and ordered by index. */
export async function revisionsForEntries(ids: string[]): Promise<Map<string, Revision[]>> {
  const map = new Map<string, Revision[]>()
  if (ids.length === 0) return map
  const rows = await db.revisions.where('entryId').anyOf(ids).toArray()
  for (const r of rows) {
    const list = map.get(r.entryId)
    if (list) list.push(r)
    else map.set(r.entryId, [r])
  }
  map.forEach((list) => list.sort((a, b) => a.index - b.index))
  return map
}

export async function allSubjects(): Promise<string[]> {
  const set = new Set<string>()
  await db.entries.each((e) => e.subject && set.add(e.subject))
  return [...set].sort((a, b) => a.localeCompare(b))
}

export async function searchEntries(query: string): Promise<Entry[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: Entry[] = []
  await db.entries.each((e) => {
    const haystack = `${e.topic} ${e.subject} ${e.notes} ${e.tags.join(' ')}`.toLowerCase()
    if (haystack.includes(q)) hits.push(e)
  })
  return hits.sort((a, b) => b.studyDate.localeCompare(a.studyDate)).slice(0, 50)
}

/* -------------------------------------------------------------- backup / IO */

export interface Backup {
  format: 'revision-calendar'
  version: 1
  exportedAt: string
  entries: Entry[]
  revisions: Revision[]
  settings: Settings
}

export async function exportBackup(): Promise<Backup> {
  const [entries, revisions, settings] = await Promise.all([
    db.entries.toArray(),
    db.revisions.toArray(),
    getSettings(),
  ])
  await db.settings.put({ ...settings, lastBackupAt: Date.now() })
  return {
    format: 'revision-calendar',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    revisions,
    settings,
  }
}

export type ImportMode = 'replace' | 'merge'

export async function importBackup(raw: unknown, mode: ImportMode): Promise<number> {
  const backup = raw as Backup
  if (!backup || backup.format !== 'revision-calendar' || !Array.isArray(backup.entries)) {
    throw new Error('That file is not a Revision Calendar backup.')
  }
  await db.transaction('rw', db.entries, db.revisions, db.settings, async () => {
    if (mode === 'replace') {
      await db.entries.clear()
      await db.revisions.clear()
    }
    await db.entries.bulkPut(backup.entries)
    await db.revisions.bulkPut(backup.revisions ?? [])
    if (backup.settings) await db.settings.put({ ...backup.settings, id: 'singleton' })
  })
  return backup.entries.length
}

export async function countEntries(): Promise<number> {
  return db.entries.count()
}
