interface IconProps {
  className?: string
}

const base = 'h-[1.15em] w-[1.15em]'

/** Thin, round-capped strokes so the icons read as pen marks next to the
 *  handwriting rather than as UI chrome. */
function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? base}
    >
      {children}
    </svg>
  )
}

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4.5 8.6 11.6a.6.6 0 0 0 0 .8L15 19.5" />
  </Svg>
)
export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4.5l6.4 7.1a.6.6 0 0 1 0 .8L9 19.5" />
  </Svg>
)
export const Gear = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
)
export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
)
export const Sun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)
export const Moon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8" />
  </Svg>
)
export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18.2 5.6 5.8 18.3M5.7 5.7l12.6 12.6" />
  </Svg>
)
export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.2v13.6M5.2 12h13.6" />
  </Svg>
)
export const Trash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.6 6.2h16.8M8 6V4h8v2M18.8 6.2 17.8 20H6.2L5.2 6.2" />
  </Svg>
)
export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.2 12.6 8.8 17.6 20 5.8" />
  </Svg>
)
export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z" />
  </Svg>
)
export const Book = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z" />
    <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
  </Svg>
)
export const Repeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Svg>
)
export const Alert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Svg>
)

/** A quill, for the "what I studied" heading. */
export const Quill = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 20.5c4-1 6.2-2.6 8-4.8" />
    <path d="M20.5 3.5c-9 .8-13.4 5.2-13.9 10.4-.1 1.3.3 2.4 1 3.2 4.6-.4 8.6-3.4 10.5-7.6" />
    <path d="M8.2 15.8c2.8-.6 5-2 6.4-4" />
  </Svg>
)

/** A hand-drawn flourish used to close off a heading. */
export const Flourish = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 220 14"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
    strokeLinecap="round"
    aria-hidden="true"
    className={className}
    preserveAspectRatio="none"
  >
    <path d="M2 8c26-6 52 4 78-1 26-5 50 6 76 1 20-4 32-2 42 1" opacity="0.75" />
    <path d="M96 12c8-3 16-3 24 0" opacity="0.45" />
  </svg>
)

/** Closing the diary and putting it away. */
export const SignOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
    <path d="M17 15.5 20.5 12 17 8.5" />
    <path d="M20 12H9.5" />
  </Svg>
)

/** Little pressed-flower asterisk for empty states. */
export const Sprig = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v17" />
    <path d="M12 9c-2.6-2.6-5-3-6.5-2.6C5.8 8.2 8 11 12 11" />
    <path d="M12 13c2.6-2.6 5-3 6.5-2.6C18.2 12.2 16 15 12 15" />
  </Svg>
)
