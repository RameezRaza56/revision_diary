import Dexie, { type Table } from 'dexie'
import type { Entry, Revision, Settings } from './schema'

/**
 * The pre-sync, device-only database. It exists now for exactly one reason:
 * anything she wrote before signing in still lives here, and must be carried
 * up to her account the first time she logs in on this device. Nothing else
 * in the app reads it.
 */
class LegacyDB extends Dexie {
  entries!: Table<Entry, string>
  revisions!: Table<Revision, string>
  settings!: Table<Settings, string>

  constructor() {
    super('revision-calendar')
    this.version(1).stores({
      entries: 'id, studyDate, subject',
      revisions: 'id, entryId, dueDate, status, [status+dueDate]',
      settings: 'id',
    })
  }
}

export interface LegacyData {
  entries: Entry[]
  revisions: Revision[]
  settings: Settings | undefined
}

/** Read whatever the old local diary holds. Resolves to null if there's
 *  nothing there, or if the database doesn't exist on this device at all. */
export async function readLegacyDiary(): Promise<LegacyData | null> {
  const names = await Dexie.getDatabaseNames()
  if (!names.includes('revision-calendar')) return null

  const legacy = new LegacyDB()
  try {
    const [entries, revisions, settings] = await Promise.all([
      legacy.entries.toArray(),
      legacy.revisions.toArray(),
      legacy.settings.get('singleton'),
    ])
    if (entries.length === 0) return null
    return { entries, revisions, settings }
  } catch {
    // A missing or unreadable old database is not worth failing sign-in over.
    return null
  } finally {
    legacy.close()
  }
}
