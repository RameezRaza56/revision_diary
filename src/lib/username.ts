import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

/** Letters, digits, underscore and dot. Stored lowercase so "Sara" and "sara"
 *  can't both be taken. */
const SHAPE = /^[a-z0-9._]{3,20}$/
const RESERVED = new Set(['admin', 'root', 'support', 'help', 'about', 'settings', 'profile'])

export const normalise = (raw: string): string => raw.trim().toLowerCase()

export function validate(raw: string): string | null {
  const name = normalise(raw)
  if (name.length < 3) return 'At least 3 characters.'
  if (name.length > 20) return 'At most 20 characters.'
  if (!SHAPE.test(name)) return 'Letters, numbers, full stops and underscores only.'
  if (name.startsWith('.') || name.endsWith('.')) return "Can't start or end with a full stop."
  if (RESERVED.has(name)) return 'That one is reserved. Pick another.'
  return null
}

export const usernameDoc = (name: string) => doc(db, 'usernames', normalise(name))

export interface UsernameRecord {
  uid: string
  email: string
}

/** Whoever holds this username, or null. Readable signed-out so that the
 *  sign-in box can turn a username into the email Firebase needs. */
export async function lookup(name: string): Promise<UsernameRecord | null> {
  if (validate(name)) return null
  const snap = await getDoc(usernameDoc(name))
  return snap.exists() ? (snap.data() as UsernameRecord) : null
}

export async function isTaken(name: string, byUid?: string): Promise<boolean> {
  const found = await lookup(name)
  return Boolean(found) && found?.uid !== byUid
}

/**
 * Take a username, releasing the previous one. Uniqueness is enforced by the
 * rules — `create` only matches when the document does not already exist — so
 * two people claiming the same name at the same moment cannot both win, no
 * matter what the UI checked a moment earlier.
 */
export async function claim(
  name: string,
  uid: string,
  email: string,
  previous?: string | null,
): Promise<void> {
  const wanted = normalise(name)
  if (previous && normalise(previous) === wanted) return

  // create-only: fails if somebody already holds it
  await setDoc(usernameDoc(wanted), { uid, email } satisfies UsernameRecord)

  if (previous) {
    await deleteDoc(usernameDoc(previous)).catch(() => {
      // losing the old reservation is untidy, not broken
    })
  }
}

export async function release(name: string): Promise<void> {
  await deleteDoc(usernameDoc(name)).catch(() => {})
}

/** Sign-in accepts either form; anything without an @ is treated as a username. */
export const looksLikeEmail = (value: string): boolean => value.includes('@')
