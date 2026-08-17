import type { CSSProperties } from 'react'

/** The pens in the pencil case. A subject always gets the same one, and there
 *  is no palette to configure. */
const PENS = [
  '#6d4bc0', // violet
  '#2f7fb5', // blue
  '#2f8f6b', // green
  '#b5761e', // amber
  '#c04a4a', // red
  '#c1508a', // pink
  '#1f8f96', // teal
  '#5c62c4', // indigo
]

export function subjectPen(subject: string): string {
  let hash = 0
  const s = subject.trim().toLowerCase() || 'general'
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return PENS[hash % PENS.length]
}

/**
 * A subject tag written in that subject's pen. The text colour is mixed with
 * `--ink`, so the same expression stays readable on cream paper by day and on
 * the dusky page at night without either theme knowing about the other.
 */
export function penStyle(subject: string): CSSProperties {
  const pen = subjectPen(subject)
  return {
    background: `color-mix(in srgb, ${pen} 15%, transparent)`,
    color: `color-mix(in srgb, ${pen} 62%, var(--ink))`,
    borderColor: `color-mix(in srgb, ${pen} 38%, transparent)`,
  }
}
