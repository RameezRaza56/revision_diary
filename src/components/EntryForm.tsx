import { useEffect, useRef, useState } from 'react'
import type { Entry } from '../db/schema'
import { useDiary } from '../db/DiaryContext'
import { addEntry, updateEntry, type EntryDraft } from '../db/storage'

interface Props {
  dateKey: string
  subjects: string[]
  editing: Entry | null
  onDone: () => void
}

const blank = { subject: '', topic: '', notes: '' }

export default function EntryForm({ dateKey, subjects, editing, onDone }: Props) {
  const { settings, revisions } = useDiary()
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const topicRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(
      editing
        ? { subject: editing.subject, topic: editing.topic, notes: editing.notes }
        : blank,
    )
    setError('')
  }, [editing, dateKey])

  // Claim the cursor when the page opens and when an edit starts — but *not* on
  // every date change, or turning to another day would trap focus in here and
  // swallow the arrow keys that turn the page.
  useEffect(() => {
    topicRef.current?.focus()
  }, [editing])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) {
      setError('Give the topic a name first.')
      return
    }
    setBusy(true)
    try {
      const draft: EntryDraft = {
        studyDate: dateKey,
        subject: form.subject.trim(),
        topic: form.topic.trim(),
        notes: form.notes.trim(),
      }
      if (editing) {
        const mine = revisions.filter((r) => r.entryId === editing.id)
        await updateEntry(editing.id, draft, settings, editing, mine)
      } else {
        await addEntry(draft, settings)
      }
      setForm(blank)
      onDone()
      topicRef.current?.focus()
    } catch {
      setError('Could not write that down. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Field label="Subject">
          <input
            list="subject-options"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="ink-field"
          />
          <datalist id="subject-options">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        <Field label="Topic">
          <input
            ref={topicRef}
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            className="ink-field"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="ink-field"
        />
      </Field>

      {error && <p className="text-base text-danger">{error}</p>}

      <div className="mt-1 flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-ink btn-ink-solid text-base">
          {editing ? 'Save' : 'Write it down'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="text-base text-ink-soft transition hover:text-accent"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
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
