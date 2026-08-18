import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { createSettings } from '../db/storage'
import { claim, isTaken, lookup, looksLikeEmail, validate } from '../lib/username'
import { Flourish } from './Icons'
import SignInScene from './SignInScene'

type Mode = 'in' | 'up'

/** Firebase's codes are accurate but unkind; say it the way the diary would. */
function readable(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That does not look like an email address.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Those details do not match. Try again?'
    case 'auth/email-already-in-use':
      return 'There is already a diary under that email — sign in instead.'
    case 'auth/weak-password':
      return 'Give the password at least six characters.'
    case 'auth/network-request-failed':
      return 'No connection. The first sign-in needs one.'
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a minute and go again.'
    default:
      return 'That did not work. Try again?'
  }
}

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('in')
  const [who, setWho] = useState('') // email or username, when signing in
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  /* --------------------------------------------------- username availability */

  const [nameState, setNameState] = useState<'idle' | 'checking' | 'free' | 'taken' | 'error'>('idle')
  const shapeError = username ? validate(username) : null

  useEffect(() => {
    if (mode !== 'up' || !username || shapeError) return setNameState('idle')
    setNameState('checking')
    let live = true
    const t = setTimeout(async () => {
      try {
        const taken = await isTaken(username)
        if (live) setNameState(taken ? 'taken' : 'free')
      } catch (err) {
        // usually the rules: the usernames collection must allow `get`
        console.error('Username check failed:', err)
        if (live) setNameState('error')
      }
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [username, shapeError, mode])

  /* ------------------------------------------------------------------ submit */

  async function signIn() {
    // Anything without an @ is a username, so turn it into the email that
    // Firebase actually signs in with.
    let address = who.trim()
    if (!looksLikeEmail(address)) {
      const found = await lookup(address)
      if (!found) {
        setError('No diary with that username.')
        return
      }
      address = found.email
    }
    await signInWithEmailAndPassword(auth, address, password)
  }

  async function signUp() {
    const wanted = username.toLowerCase()
    const created = await createUserWithEmailAndPassword(auth, email.trim(), password)

    // Only possible once signed in: the rules check the uid and email on the
    // reservation against the token.
    let claimed: string | null = null
    try {
      await claim(wanted, created.user.uid, created.user.email ?? email.trim())
      claimed = wanted
    } catch {
      // Someone took it between the check and here. The account is real and
      // she is signed in, so say so rather than throwing the whole thing away.
      setNote(`@${wanted} was taken a moment ago — pick another in Profile.`)
    }

    // Mirror it onto her settings; the reservation alone cannot be looked up
    // by uid, so this is what the app actually displays.
    await createSettings(claimed).catch(() => {})
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNote('')
    setBusy(true)
    try {
      if (mode === 'up') await signUp()
      else await signIn()
    } catch (err) {
      setError(readable((err as { code?: string }).code))
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    const address = who.trim()
    if (!looksLikeEmail(address)) {
      setError('Put your email address in first and I will send a reset link.')
      return
    }
    setError('')
    try {
      await sendPasswordResetEmail(auth, address)
      setNote('Sent — check your email for a link to set a new password.')
    } catch (err) {
      setError(readable((err as { code?: string }).code))
    }
  }

  const canSubmit =
    mode === 'in'
      ? who.trim() !== '' && password !== ''
      : email.trim() !== '' && password !== '' && nameState === 'free'

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
          {mode === 'in' ? (
            <Field label="Email or username">
              <input
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={who}
                onChange={(e) => setWho(e.target.value)}
                className="ink-field"
              />
            </Field>
          ) : (
            <>
              <Field label="Email">
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ink-field"
                />
              </Field>

              <Field label="Username">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xl text-ink-faint">@</span>
                  <input
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="ink-field"
                  />
                </div>
                <span className="text-sm">
                  {shapeError ? (
                    <span className="text-danger">{shapeError}</span>
                  ) : nameState === 'checking' ? (
                    <span className="text-ink-faint">checking…</span>
                  ) : nameState === 'free' ? (
                    <span className="text-done">@{username} is free.</span>
                  ) : nameState === 'taken' ? (
                    <span className="text-danger">@{username} is taken.</span>
                  ) : nameState === 'error' ? (
                    <span className="text-danger">
                      Could not check that name right now — try again in a moment.
                    </span>
                  ) : (
                    <span className="text-ink-faint">
                      Letters, numbers, full stops and underscores.
                    </span>
                  )}
                </span>
              </Field>
            </>
          )}

          <Field label="Password">
            <input
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ink-field"
            />
          </Field>

          {error && <p className="text-base text-danger">{error}</p>}
          {note && <p className="text-base text-done">{note}</p>}

          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="btn-ink btn-ink-solid mt-1 justify-self-start text-base disabled:opacity-40"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-0.5">
      <span className="text-sm text-ink-faint">{label}</span>
      {children}
    </label>
  )
}
