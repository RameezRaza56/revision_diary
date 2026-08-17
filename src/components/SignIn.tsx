import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Flourish } from './Icons'
import SignInScene from './SignInScene'

type Mode = 'in' | 'up'

/** Firebase's codes are accurate but unkind; say it the way the diary would. */
function readable(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return "That doesn't look like an email address."
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That email and password don't match. Try again?"
    case 'auth/email-already-in-use':
      return 'There is already a diary under that email — sign in instead.'
    case 'auth/weak-password':
      return 'Give it at least six characters.'
    case 'auth/network-request-failed':
      return 'No connection. Signing in the first time needs one.'
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a minute and go again.'
    default:
      return 'That did not work. Try again?'
  }
}

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNote('')
    setBusy(true)
    try {
      if (mode === 'up') await createUserWithEmailAndPassword(auth, email.trim(), password)
      else await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(readable((err as { code?: string }).code ?? ''))
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setError('Put your email in first and I will send a reset link.')
      return
    }
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setNote('Sent — check your email for a link to set a new password.')
    } catch (err) {
      setError(readable((err as { code?: string }).code ?? ''))
    }
  }

  return (
    <div className="desk-dim relative flex h-full items-center justify-center p-4">
      <SignInScene />

      <div className="paper book margin-rule animate-pop-in relative z-10 w-full max-w-md overflow-hidden py-8 pl-12 pr-8 sm:pl-14">
        <div className="ribbon right-8 top-0" aria-hidden />

        <p className="font-display text-xl text-ink-faint">my revision diary</p>
        <h1 className="font-display text-4xl leading-tight text-ink">
          {mode === 'in' ? 'Welcome' : 'New diary'}
        </h1>
        <Flourish className="mt-1 h-3 w-48 text-ink-faint" />

        <form onSubmit={submit} className="mt-5 grid gap-3">
          <label className="grid gap-0.5">
            <span className="text-sm text-ink-faint">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ink-field"
            />
          </label>

          <label className="grid gap-0.5">
            <span className="text-sm text-ink-faint">Password</span>
            <input
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ink-field"
            />
          </label>

          {error && <p className="text-base text-danger">{error}</p>}
          {note && <p className="text-base text-done">{note}</p>}

          <button
            type="submit"
            disabled={busy}
            className="btn-ink btn-ink-solid mt-1 justify-self-start text-base"
          >
            {busy ? 'One moment…' : mode === 'in' ? 'Open my diary' : 'Create it'}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in')
              setError('')
              setNote('')
            }}
            className="transition hover:text-accent"
          >
            {mode === 'in' ? 'New user' : 'Sign in'}
          </button>
          {mode === 'in' && (
            <button type="button" onClick={forgot} className="transition hover:text-accent">
              Forgot password
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
