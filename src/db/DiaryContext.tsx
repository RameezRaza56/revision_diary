import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getDoc, onSnapshot, type SnapshotListenOptions } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '../lib/firebase'
import { DEFAULT_SETTINGS, type Entry, type Revision, type Settings } from './schema'
import { entriesCol, revisionsCol, settingsDoc, uploadLegacyDiary } from './storage'
import { readLegacyDiary } from './legacy'

export interface SyncState {
  /** Reading from the local cache because the server is unreachable. */
  offline: boolean
  /** Local edits not yet acknowledged by the server. */
  pending: boolean
}

interface DiaryValue {
  user: User | null
  authReady: boolean
  loading: boolean
  entries: Entry[]
  revisions: Revision[]
  settings: Settings
  sync: SyncState
}

const DiaryContext = createContext<DiaryValue | null>(null)

export function useDiary(): DiaryValue {
  const value = useContext(DiaryContext)
  if (!value) throw new Error('useDiary must be used inside <DiaryProvider>')
  return value
}

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!firebaseConfigured)

  const [entries, setEntries] = useState<Entry[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState({ entries: false, revisions: false, settings: false })
  const [sync, setSync] = useState<SyncState>({ offline: false, pending: false })

  /* ----------------------------------------------------------------- auth */

  useEffect(() => {
    if (!firebaseConfigured) return
    // Firebase persists the session itself, so this fires with the signed-in
    // user on a cold, offline launch too.
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setAuthReady(true)
    })
  }, [])

  /* ------------------------------------------------------- live diary data */

  useEffect(() => {
    if (!user) {
      setEntries([])
      setRevisions([])
      setSettings(DEFAULT_SETTINGS)
      setLoaded({ entries: false, revisions: false, settings: false })
      return
    }

    // Metadata changes are what surface "offline" and "not yet synced" in the UI.
    const opts: SnapshotListenOptions = { includeMetadataChanges: true }

    const stopEntries = onSnapshot(entriesCol(db, user.uid), opts, (snap) => {
      setEntries(snap.docs.map((d) => d.data() as Entry))
      setLoaded((l) => ({ ...l, entries: true }))
      setSync({ offline: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites })
    })

    const stopRevisions = onSnapshot(revisionsCol(db, user.uid), opts, (snap) => {
      setRevisions(snap.docs.map((d) => d.data() as Revision))
      setLoaded((l) => ({ ...l, revisions: true }))
    })

    const stopSettings = onSnapshot(settingsDoc(db, user.uid), opts, (snap) => {
      setSettings(
        snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as Settings) } : DEFAULT_SETTINGS,
      )
      setLoaded((l) => ({ ...l, settings: true }))
    })

    return () => {
      stopEntries()
      stopRevisions()
      stopSettings()
    }
  }, [user])

  /* ------------------------------------------------------------ migration */

  useEffect(() => {
    if (!user) return
    const flag = `diary-migrated:${user.uid}`
    if (localStorage.getItem(flag)) return

    let cancelled = false
    ;(async () => {
      const legacy = await readLegacyDiary()
      if (cancelled) return
      if (!legacy) {
        localStorage.setItem(flag, 'nothing-to-migrate')
        return
      }
      const existing = await getDoc(settingsDoc(db, user.uid))
      if (cancelled) return
      await uploadLegacyDiary(
        legacy.entries,
        legacy.revisions,
        legacy.settings,
        existing.exists(),
      )
      localStorage.setItem(flag, new Date().toISOString())
    })().catch((err) => console.error('Could not carry over the old diary:', err))

    return () => {
      cancelled = true
    }
  }, [user])

  const value = useMemo<DiaryValue>(
    () => ({
      user,
      authReady,
      loading: Boolean(user) && !(loaded.entries && loaded.revisions && loaded.settings),
      entries,
      revisions,
      settings,
      sync,
    }),
    [user, authReady, loaded, entries, revisions, settings, sync],
  )

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>
}
