import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { DEFAULT_SETTINGS, type Entry, type Revision, type Settings } from './schema'
import { buildRevisions, reconcileRevisions } from '../lib/schedule'
import { todayKey } from '../lib/dates'

/* --------------------------------------------------------------- locations */

function uid(): string {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in.')
  return user.uid
}

export const entriesCol = (database: Firestore, userId: string) =>
  collection(database, 'users', userId, 'entries')
export const revisionsCol = (database: Firestore, userId: string) =>
  collection(database, 'users', userId, 'revisions')
export const settingsDoc = (database: Firestore, userId: string) =>
  doc(database, 'users', userId, 'meta', 'settings')

/* ------------------------------------------------------------------ writes
 *
 * Every write here is fire-and-forget on purpose. Firestore applies a write to
 * the local cache immediately, but the promise from commit() only settles once
 * the server acknowledges it — which never happens while she's offline. If the
 * UI awaited that, saving a topic on a train would hang forever. So we let the
 * local write land (listeners fire, the screen updates) and leave the server
 * round-trip to finish whenever the connection comes back.
 */

function commit(batch: WriteBatch): void {
  batch.commit().catch((err) => console.error('Sync write failed:', err))
}

/** Split into chunks: a Firestore batch tops out at 500 operations. */
function batched(ops: ((batch: WriteBatch) => void)[]): void {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db)
    ops.slice(i, i + 450).forEach((op) => op(batch))
    commit(batch)
  }
}

export interface EntryDraft {
  studyDate: string
  subject: string
  topic: string
  notes: string
}

export async function addEntry(draft: EntryDraft, settings: Settings): Promise<string> {
  const userId = uid()
  const now = Date.now()
  const entry: Entry = { id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now }
  const revisions = buildRevisions(entry.id, entry.studyDate, settings)

  const batch = writeBatch(db)
  batch.set(doc(entriesCol(db, userId), entry.id), entry)
  revisions.forEach((r) => batch.set(doc(revisionsCol(db, userId), r.id), r))
  commit(batch)

  return entry.id
}

export async function updateEntry(
  id: string,
  patch: Partial<EntryDraft>,
  settings: Settings,
  current: Entry,
  existingRevisions: Revision[],
): Promise<void> {
  const userId = uid()
  const next: Entry = { ...current, ...patch, updatedAt: Date.now() }

  const batch = writeBatch(db)
  batch.set(doc(entriesCol(db, userId), id), next)

  // Moving the study date invalidates every date downstream of it.
  if (patch.studyDate && patch.studyDate !== current.studyDate) {
    const { keep, remove, add } = reconcileRevisions(
      id,
      next.studyDate,
      existingRevisions,
      settings,
    )
    remove.forEach((rid) => batch.delete(doc(revisionsCol(db, userId), rid)))
    ;[...keep, ...add].forEach((r) => batch.set(doc(revisionsCol(db, userId), r.id), r))
  }
  commit(batch)
}

export async function deleteEntry(id: string, revisions: Revision[]): Promise<void> {
  const userId = uid()
  const batch = writeBatch(db)
  batch.delete(doc(entriesCol(db, userId), id))
  revisions.filter((r) => r.entryId === id).forEach((r) =>
    batch.delete(doc(revisionsCol(db, userId), r.id)),
  )
  commit(batch)
}

export async function setRevisionStatus(
  revision: Revision,
  status: Revision['status'],
  confidence: number | null = null,
): Promise<void> {
  const userId = uid()
  const next: Revision = {
    ...revision,
    status,
    completedDate: status === 'pending' ? null : todayKey(),
    confidence: status === 'done' ? confidence : null,
  }
  setDoc(doc(revisionsCol(db, userId), revision.id), next).catch((err) =>
    console.error('Sync write failed:', err),
  )
}

/**
 * Persist settings. When the revision pattern itself changed, `applyToExisting`
 * re-lays-out every entry's *pending* revisions; completed ones never move.
 */
export async function saveSettings(
  next: Settings,
  applyToExisting: boolean,
  entries: Entry[],
  revisions: Revision[],
): Promise<void> {
  const userId = uid()
  setDoc(settingsDoc(db, userId), next).catch((err) =>
    console.error('Sync write failed:', err),
  )

  if (!applyToExisting) return

  const ops: ((batch: WriteBatch) => void)[] = []
  for (const entry of entries) {
    const existing = revisions.filter((r) => r.entryId === entry.id)
    const { keep, remove, add } = reconcileRevisions(entry.id, entry.studyDate, existing, next)
    remove.forEach((rid) => ops.push((b) => b.delete(doc(revisionsCol(db, userId), rid))))
    ;[...keep, ...add].forEach((r) =>
      ops.push((b) => b.set(doc(revisionsCol(db, userId), r.id), r)),
    )
  }
  batched(ops)
}

/** Theme, font and text size all live in the same settings document. */
export async function saveAppearance(
  settings: Settings,
  patch: Partial<Pick<Settings, 'theme' | 'font' | 'textSize'>>,
): Promise<void> {
  setDoc(settingsDoc(db, uid()), { ...settings, ...patch }).catch((err) =>
    console.error('Sync write failed:', err),
  )
}

/** The first write for a brand-new account: her defaults, plus the name she
 *  chose at sign-up so the app has something to show straight away. */
export async function createSettings(username: string | null): Promise<void> {
  await setDoc(settingsDoc(db, uid()), { ...DEFAULT_SETTINGS, username })
}

/** Mirror the claimed name onto her settings so the app can show it. */
export async function saveUsername(settings: Settings, username: string | null): Promise<void> {
  await setDoc(settingsDoc(db, uid()), { ...settings, username })
}

export async function saveTheme(settings: Settings, theme: Settings['theme']): Promise<void> {
  const userId = uid()
  setDoc(settingsDoc(db, userId), { ...settings, theme }).catch((err) =>
    console.error('Sync write failed:', err),
  )
}

/**
 * Wipe the whole diary. Called before deleting the account itself: once the
 * Firebase user is gone there is no longer permission to reach these
 * documents, and they would sit there orphaned for ever.
 *
 * Unlike every other write here this one *is* awaited — the account deletion
 * that follows must not race it.
 */
export async function deleteEverything(): Promise<void> {
  const userId = uid()
  const [entrySnap, revisionSnap] = await Promise.all([
    getDocs(entriesCol(db, userId)),
    getDocs(revisionsCol(db, userId)),
  ])

  const refs = [
    ...entrySnap.docs.map((d) => d.ref),
    ...revisionSnap.docs.map((d) => d.ref),
    settingsDoc(db, userId),
  ]
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db)
    refs.slice(i, i + 450).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

/* --------------------------------------------------------------- migration */

/**
 * Carry a device-only diary written before sign-in up into the account. Uses
 * merge-style writes keyed by the original ids, so running it twice — or on a
 * second device holding the same old data — can't duplicate anything.
 */
export async function uploadLegacyDiary(
  entries: Entry[],
  revisions: Revision[],
  settings: Settings | undefined,
  cloudHasSettings: boolean,
): Promise<void> {
  const userId = uid()
  const ops: ((batch: WriteBatch) => void)[] = []
  entries.forEach((e) => ops.push((b) => b.set(doc(entriesCol(db, userId), e.id), e)))
  revisions.forEach((r) => ops.push((b) => b.set(doc(revisionsCol(db, userId), r.id), r)))
  batched(ops)

  // Only adopt the old settings if the account doesn't have its own yet —
  // the second device to migrate must not overwrite the first one's pattern.
  if (settings && !cloudHasSettings) {
    await setDoc(settingsDoc(db, userId), { ...DEFAULT_SETTINGS, ...settings, id: 'singleton' })
  }
}
