import { useEffect, useMemo, useState } from 'react'
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useDiary } from '../db/DiaryContext'
import { deleteEverything, saveUsername } from '../db/storage'
import type { Settings } from '../db/schema'
import { forgetTheme } from '../lib/theme'
import { claim, isTaken, release, validate } from '../lib/username'
import { addDaysKey, todayKey } from '../lib/dates'
import { SignOut, Trash } from './Icons'
import Panel, { Section } from './Panel'

type Tab = 'you' | 'password' | 'account'

export default function ProfilePanel({ onClose }: { onClose: () => void }) {
  const { user, settings, entries, revisions } = useDiary()
  const [tab, setTab] = useState<Tab>('you')

  const stats = useMemo(() => {
    const written = new Set(entries.map((e) => e.studyDate))
    // Consecutive days ending today, though a day not yet written doesn't
    // break it — the streak only dies once yesterday is missed too.
    let streak = 0
    for (let i = written.has(todayKey()) ? 0 : 1; i < 400; i++) {
      if (!written.has(addDaysKey(todayKey(), -i))) break
      streak++
    }
    return {
      topics: entries.length,
      done: revisions.filter((r) => r.status === 'done').length,
      days: written.size,
      streak,
    }
  }, [entries, revisions])

  return (
    <Panel
      label="Profile"
      title={settings.username ? `@${settings.username}` : 'Your diary'}
      subtitle={user?.email ?? ''}
      tabs={[
        { id: 'you', label: 'You' },
        { id: 'password', label: 'Password' },
        { id: 'account', label: 'Account' },
      ]}
      active={tab}
      onTab={(t) => setTab(t as Tab)}
      onClose={onClose}
    >
      {tab === 'you' && (
        <>
          <Section title="At a glance">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat value={stats.topics} label="topics" />
              <Stat value={stats.done} label="revisions done" />
              <Stat value={stats.days} label="days written" />
              <Stat value={stats.streak} label="day streak" />
            </div>
          </Section>

          <UsernameSection settings={settings} />

          <Section title="This device">
            <button
              type="button"
              onClick={() => {
                forgetTheme()
                signOut(auth)
              }}
              className="btn-ink justify-self-start text-base"
            >
              <SignOut className="h-4 w-4" /> Sign out
            </button>
          </Section>
        </>
      )}

      {tab === 'password' && <PasswordSection />}
      {tab === 'account' && <DangerSection settings={settings} />}
    </Panel>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="hand-edge border border-line-soft bg-surface-2/40 px-3 py-2">
      <p className="font-display text-2xl leading-none text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-ink-faint">{label}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ username */

function UsernameSection({ settings }: { settings: Settings }) {
  const current = settings.username
  const [value, setValue] = useState(current ?? '')
  const [state, setState] = useState<'idle' | 'checking' | 'free' | 'taken' | 'error'>('idle')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const shapeError = value ? validate(value) : null

  useEffect(() => {
    setSaved(false)
    setError('')
    if (!value || shapeError || value === current) return setState('idle')
    setState('checking')
    let live = true
    const t = setTimeout(async () => {
      try {
        const taken = await isTaken(value, auth.currentUser?.uid)
        if (live) setState(taken ? 'taken' : 'free')
      } catch (err) {
        // usually the rules: the usernames collection must allow `get`
        console.error('Username check failed:', err)
        if (live) setState('error')
      }
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [value, shapeError, current])

  async function save() {
    const user = auth.currentUser
    if (!user?.email) return
    setBusy(true)
    setError('')
    try {
      await claim(value, user.uid, user.email, current)
      await saveUsername(settings, value.toLowerCase())
      setSaved(true)
    } catch {
      // the rules refuse a create when that name already exists
      setError('Someone claimed that one a moment ago. Try another.')
      setState('taken')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Username"
      hint={
        current
          ? 'You can sign in with this or your email.'
          : 'Claim one and you can sign in with it instead of your email.'
      }
    >
      <div className="flex items-center gap-1.5">
        <span className="font-display text-xl text-ink-faint">@</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          placeholder="sara.studies"
          spellCheck={false}
          autoCapitalize="none"
          className="ink-field max-w-xs"
        />
      </div>
      <p className="text-sm">
        {shapeError ? (
          <span className="text-danger">{shapeError}</span>
        ) : state === 'checking' ? (
          <span className="text-ink-faint">checking…</span>
        ) : state === 'free' ? (
          <span className="text-done">@{value} is free.</span>
        ) : state === 'taken' ? (
          <span className="text-danger">@{value} is already taken.</span>
        ) : state === 'error' ? (
          <span className="text-danger">
            Could not check that name right now — try again in a moment.
          </span>
        ) : (
          <span className="text-ink-faint">
            Letters, numbers, full stops and underscores. 3–20 characters.
          </span>
        )}
      </p>
      {error && <p className="text-base text-danger">{error}</p>}
      {saved && <p className="text-base text-done">Saved — you can sign in with it now.</p>}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={busy || state !== 'free'}
          onClick={save}
          className="btn-ink btn-ink-solid text-base disabled:opacity-40"
        >
          {busy ? 'Saving…' : current ? 'Change it' : 'Claim it'}
        </button>
        {current && (
          <button
            type="button"
            onClick={async () => {
              await release(current)
              await saveUsername(settings, null)
              setValue('')
            }}
            className="text-base text-ink-soft transition hover:text-danger"
          >
            Remove
          </button>
        )}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ password */

function PasswordSection() {
  const [currentPw, setCurrentPw] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setDone(false)
    if (next.length < 6) return setError('Give it at least six characters.')
    if (next !== confirm) return setError('The two new passwords do not match.')
    const user = auth.currentUser
    if (!user?.email) return

    setBusy(true)
    try {
      // Firebase insists on a fresh sign-in before a password change, which
      // doubles as the confirmation that it is really her at the keyboard.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPw))
      await updatePassword(user, next)
      setDone(true)
      setCurrentPw('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(readable((err as { code?: string }).code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Change password" hint="You will stay signed in on this device.">
      <form onSubmit={submit} className="grid max-w-sm gap-3">
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="ink-field"
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="ink-field"
          />
        </Field>
        <Field label="New password again">
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="ink-field"
          />
        </Field>
        {error && <p className="text-base text-danger">{error}</p>}
        {done && <p className="text-base text-done">Password changed.</p>}
        <button
          type="submit"
          disabled={busy || !currentPw || !next}
          className="btn-ink btn-ink-solid justify-self-start text-base disabled:opacity-40"
        >
          {busy ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </Section>
  )
}

/* -------------------------------------------------------------------- danger */

function DangerSection({ settings }: { settings: Settings }) {
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const user = auth.currentUser
    if (!user?.email) return
    setBusy(true)
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
      // The diary goes first: once the account is gone there is no longer any
      // permission to reach these documents, and they would be orphaned.
      await deleteEverything()
      if (settings.username) await release(settings.username)
      forgetTheme()
      await deleteUser(user)
    } catch (err) {
      setError(readable((err as { code?: string }).code))
      setBusy(false)
    }
  }

  return (
    <Section
      title="Delete account"
      hint="Every topic and every revision, gone for good. There is no backup."
    >
      <form onSubmit={remove} className="grid max-w-sm gap-3">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1.5 h-4 w-4 accent-[var(--danger)]"
          />
          <span className="text-base text-ink">
            I understand this cannot be undone
          </span>
        </label>
        <Field label="Confirm with your password">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ink-field"
          />
        </Field>
        {error && <p className="text-base text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy || !confirmed || !password}
          className="btn-ink justify-self-start border-danger text-base text-danger hover:bg-danger-soft disabled:opacity-40"
        >
          <Trash className="h-4 w-4" /> {busy ? 'Deleting…' : 'Delete my account'}
        </button>
      </form>
    </Section>
  )
}

/* ------------------------------------------------------------------- shared */

function readable(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'That password is wrong.'
    case 'auth/weak-password':
      return 'Give it at least six characters.'
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a minute and go again.'
    case 'auth/network-request-failed':
      return 'No connection — this one needs the internet.'
    default:
      return 'That did not work. Try again.'
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-0.5">
      <span className="text-sm text-ink-faint">{label}</span>
      {children}
    </label>
  )
}
