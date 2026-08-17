import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

/**
 * Firebase config comes from .env — see .env.example. These values are
 * identifiers rather than secrets (they ship in the JS bundle by design);
 * what actually protects the diary is the rule in firestore.rules, which
 * only lets a signed-in user touch documents under their own uid.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** True when .env has been filled in. Lets the UI explain itself instead of
 *  throwing something cryptic on a fresh clone. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

if (firebaseConfigured) {
  app = initializeApp(config)
  authInstance = getAuth(app)

  // The persistent cache is what keeps this an offline-first diary: reads are
  // served from IndexedDB, writes queue locally, and both reconcile whenever
  // the device next has a connection. Multi-tab so two windows can't corrupt
  // each other's cache.
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })

  // `VITE_USE_FIREBASE_EMULATOR=1 npm run dev` runs everything against the local
  // Firebase emulators, so you can try things out without touching the real diary.
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === '1') {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080)
  }
}

export const auth = authInstance as Auth
export const db = dbInstance as Firestore
