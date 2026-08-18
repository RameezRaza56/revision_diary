/**
 * The font library. Each face is self-hosted and precached, so switching works
 * offline and no request ever leaves the device.
 *
 * `scale` corrects for how differently these faces sit on the line — Caveat
 * rides small, Playfair fills its em — so every choice reads at roughly the
 * same size rather than the whole app jumping when she switches.
 */
export interface FontChoice {
  id: string
  label: string
  blurb: string
  family: string
  scale: number
}

export const FONTS: FontChoice[] = [
  {
    id: 'lora',
    label: 'Lora',
    blurb: 'Warm serif. Steady for long reading.',
    family: "'Lora', Georgia, serif",
    scale: 1,
  },
  {
    id: 'source-serif',
    label: 'Source Serif',
    blurb: 'Plain and sturdy, made for text.',
    family: "'Source Serif 4', Georgia, serif",
    scale: 1.02,
  },
  {
    id: 'inter',
    label: 'Inter',
    blurb: 'Clean and modern. Nothing decorative.',
    family: "'Inter', system-ui, sans-serif",
    scale: 0.98,
  },
  {
    id: 'atkinson',
    label: 'Atkinson',
    blurb: 'Drawn for legibility — easiest to read.',
    family: "'Atkinson Hyperlegible', system-ui, sans-serif",
    scale: 1,
  },
  {
    id: 'nunito',
    label: 'Nunito',
    blurb: 'Soft and rounded. Friendly.',
    family: "'Nunito', system-ui, sans-serif",
    scale: 1,
  },
  {
    id: 'playfair',
    label: 'Playfair',
    blurb: 'Elegant and formal, like a printed book.',
    family: "'Playfair Display', Georgia, serif",
    scale: 0.96,
  },
  {
    id: 'patrick-hand',
    label: 'Patrick Hand',
    blurb: 'Neat handwriting. Like a real diary.',
    family: "'Patrick Hand', cursive",
    scale: 1.02,
  },
  {
    id: 'caveat',
    label: 'Caveat',
    blurb: 'Flowing handwriting. The prettiest, the hardest to read.',
    family: "'Caveat', cursive",
    scale: 1.22,
  },
]

/** Readable, characterful, and not so styled that it distracts from studying. */
export const DEFAULT_FONT = 'lora'

export const TEXT_SIZES = [
  { id: 'small', label: 'Small', scale: 0.92 },
  { id: 'normal', label: 'Normal', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.1 },
  { id: 'largest', label: 'Largest', scale: 1.22 },
] as const

export type TextSizeId = (typeof TEXT_SIZES)[number]['id']
export const DEFAULT_TEXT_SIZE: TextSizeId = 'normal'

export const fontById = (id: string): FontChoice =>
  FONTS.find((f) => f.id === id) ?? FONTS[0]

export const textScaleById = (id: string): number =>
  TEXT_SIZES.find((t) => t.id === id)?.scale ?? 1

/** Everything visual about type is two custom properties on the root element. */
export function applyAppearance(fontId: string, textSizeId: string): void {
  const font = fontById(fontId)
  const root = document.documentElement
  root.style.setProperty('--font-body', font.family)
  root.style.setProperty('--font-display', font.family)
  root.style.setProperty('--font-scale', String(font.scale))
  root.style.setProperty('--text-scale', String(textScaleById(textSizeId)))
}
