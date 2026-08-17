import { useEffect, useMemo, useRef, useState } from 'react'
import { useDiary } from '../db/DiaryContext'
import { searchEntries } from '../lib/select'
import { subjectPen } from '../lib/colors'
import { shortDate } from '../lib/dates'
import { Close, Search } from './Icons'

interface Props {
  onPick: (dateKey: string) => void
  onClose: () => void
}

export default function SearchOverlay({ onPick, onClose }: Props) {
  const { entries } = useDiary()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // The whole diary is already in memory, so this needs no debounce and no
  // round-trip — it filters as fast as she types, online or off.
  const hits = useMemo(() => searchEntries(entries, query), [entries, query])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-bg-deep/75 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* the wrapper stays unclipped so the tape can overhang the card */}
      <div className="animate-pop-in relative w-full max-w-xl rotate-[-0.4deg]">
        <div className="tape left-1/2 top-[-0.7rem] z-10 -translate-x-1/2 -rotate-2" aria-hidden />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search the diary"
          className="paper flex max-h-[70vh] flex-col overflow-hidden rounded-[14px_10px_16px_9px] border border-line shadow-float"
        >
          <div className="flex items-center gap-2 border-b border-line-soft px-5 pb-2 pt-4">
            <Search className="h-5 w-5 shrink-0 text-ink-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Look back through everything…"
              className="ink-field min-w-0 flex-1 border-none text-lg focus:bg-transparent"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint transition hover:rotate-90 hover:text-danger"
            >
              <Close className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {query && hits.length === 0 && (
              <p className="px-3 py-8 text-center text-base text-ink-faint">
                Nothing written about that.
              </p>
            )}
            {!query && (
              <p className="px-3 py-8 text-center text-base text-ink-faint">
                Type a word and I'll find the page.
              </p>
            )}
            <ul className="grid gap-0.5">
              {hits.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(e.studyDate)
                      onClose()
                    }}
                    className="hand-edge flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition hover:bg-accent-soft/50"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: subjectPen(e.subject) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base text-ink">{e.topic}</span>
                      <span className="block truncate text-sm text-ink-faint">
                        {e.subject || 'no subject'} · {shortDate(e.studyDate)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
