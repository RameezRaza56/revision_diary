/** Stable per-subject colours: the same subject always gets the same swatch,
 *  with no palette to configure. */
const PALETTE = [
  { dot: '#8b5cf6', chipBg: 'rgb(139 92 246 / 0.16)', chipInk: '#7c3aed' },
  { dot: '#0ea5e9', chipBg: 'rgb(14 165 233 / 0.16)', chipInk: '#0284c7' },
  { dot: '#10b981', chipBg: 'rgb(16 185 129 / 0.16)', chipInk: '#059669' },
  { dot: '#f59e0b', chipBg: 'rgb(245 158 11 / 0.18)', chipInk: '#b45309' },
  { dot: '#ef4444', chipBg: 'rgb(239 68 68 / 0.16)', chipInk: '#dc2626' },
  { dot: '#ec4899', chipBg: 'rgb(236 72 153 / 0.16)', chipInk: '#db2777' },
  { dot: '#14b8a6', chipBg: 'rgb(20 184 166 / 0.16)', chipInk: '#0d9488' },
  { dot: '#6366f1', chipBg: 'rgb(99 102 241 / 0.16)', chipInk: '#4f46e5' },
]

export type SubjectColor = (typeof PALETTE)[number]

export function subjectColor(subject: string): SubjectColor {
  let hash = 0
  const s = subject.trim().toLowerCase() || 'general'
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}
