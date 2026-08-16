import Dexie, { type Table } from 'dexie'

/** A topic she studied on a given day. Dates are 'yyyy-MM-dd' strings — never Date
 *  objects — so nothing shifts when the clock crosses a timezone or DST boundary. */
export interface Entry {
  id: string
  studyDate: string
  subject: string
  topic: string
  notes: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export type RevisionStatus = 'pending' | 'done' | 'skipped'

/** One scheduled repetition of an Entry. Generated up front when the entry is
 *  saved, so rendering a month is a plain indexed range query. */
export interface Revision {
  id: string
  entryId: string
  dueDate: string
  index: number
  offsetDays: number
  status: RevisionStatus
  completedDate: string | null
  confidence: number | null
}

export type Anchor = 'studyDate' | 'previousRevision'

export interface Settings {
  id: 'singleton'
  /** Interval list in days. Length = number of revisions per topic. */
  schedule: number[]
  anchor: Anchor
  skipWeekends: boolean
  theme: 'light' | 'dark'
  lastBackupAt: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  schedule: [7, 30, 60, 120],
  anchor: 'studyDate',
  skipWeekends: false,
  theme: 'dark',
  lastBackupAt: null,
}

class RevisionDB extends Dexie {
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

export const db = new RevisionDB()
