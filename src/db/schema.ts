import { DEFAULT_FONT, DEFAULT_TEXT_SIZE } from '../lib/fonts'

/** A topic she studied on a given day. Dates are 'yyyy-MM-dd' strings — never Date
 *  objects — so nothing shifts when the clock crosses a timezone or DST boundary. */
export interface Entry {
  id: string
  studyDate: string
  subject: string
  topic: string
  notes: string
  createdAt: number
  updatedAt: number
}

export type RevisionStatus = 'pending' | 'done' | 'skipped'

/** One scheduled repetition of an Entry. Generated up front when the entry is
 *  saved, so rendering a month is a plain filter over what's already loaded. */
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
  /** id from lib/fonts.ts */
  font: string
  /** id from TEXT_SIZES in lib/fonts.ts */
  textSize: string
  /**
   * Her own copy of the username, for display. The `usernames` collection is
   * the authority on who holds what, but it is keyed by name and cannot be
   * queried by uid, so the answer to "what is mine?" is mirrored here.
   */
  username: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  schedule: [7, 30, 60, 120],
  anchor: 'studyDate',
  skipWeekends: false,
  // Matches the sign-in page, so a new account doesn't flip theme on arrival.
  theme: 'dark',
  font: DEFAULT_FONT,
  textSize: DEFAULT_TEXT_SIZE,
  username: null,
}
