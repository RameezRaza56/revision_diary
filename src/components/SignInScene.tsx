/**
 * The desk around the diary: a few pen-drawn things scattered about, drifting
 * very slightly. Purely decorative — hidden from screen readers, ignores the
 * mouse, and holds still for anyone who asked for reduced motion.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Doodle({
  className,
  delay = 0,
  tilt = 0,
  children,
}: {
  className: string
  delay?: number
  tilt?: number
  children: React.ReactNode
}) {
  return (
    <div
      className={`drift absolute ${className}`}
      style={{ animationDelay: `${delay}s`, ['--tilt' as string]: `${tilt}deg` }}
    >
      {children}
    </div>
  )
}

/** A cup of tea, steam and all, for the late revision sessions. */
function Teacup() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <g {...stroke}>
        <path className="steam" d="M26 20c3-3-3-6 0-9" style={{ animationDelay: '0s' }} />
        <path className="steam" d="M34 20c3-3-3-6 0-9" style={{ animationDelay: '1.1s' }} />
        <path d="M14 28h30v10a13 13 0 0 1-13 13h-4a13 13 0 0 1-13-13z" />
        <path d="M44 31h4a5 5 0 0 1 0 10h-4" />
        <path d="M12 57h36" />
      </g>
    </svg>
  )
}

/** A short stack of books. */
function Books() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <g {...stroke}>
        <rect x="10" y="42" width="44" height="10" rx="2" />
        <rect x="14" y="31" width="38" height="10" rx="2" />
        <rect x="8" y="20" width="42" height="10" rx="2" />
        <path d="M18 42v10M22 31v10M16 20v10" />
      </g>
    </svg>
  )
}

/** A pencil, mid-scribble. */
function Pencil() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <g {...stroke}>
        <path d="M14 50l4-10L44 14a5 5 0 0 1 7 7L25 46z" />
        <path d="M40 18l7 7" />
        <path d="M14 50l7-3" />
        <path d="M10 57c6-3 12-3 18 0" opacity="0.5" />
      </g>
    </svg>
  )
}

/** A crescent moon for the night reading. */
function Moon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <g {...stroke}>
        <path d="M46 38A20 20 0 1 1 26 12a15 15 0 0 0 20 26z" />
      </g>
    </svg>
  )
}

/** A sprig in a little pot. */
function Sprig() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <g {...stroke}>
        <path d="M22 44h20l-3 14H25z" />
        <path d="M32 44V22" />
        <path d="M32 32c-6-5-11-4-13-2 1 4 6 8 13 6" />
        <path d="M32 26c5-5 10-5 12-3-1 4-5 7-12 6" />
      </g>
    </svg>
  )
}

/** Four-pointed sparkles that come and go. */
function Sparkle({ className, delay }: { className: string; delay: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`twinkle absolute ${className}`}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden
    >
      <path
        d="M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function SignInScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-ink" aria-hidden>
      {/* the doodles keep well clear of the card on small screens */}
      <div className="hidden sm:block">
        <Doodle className="left-[14%] top-[22%] h-20 w-20 opacity-25" delay={0} tilt={-6}>
          <Teacup />
        </Doodle>
        <Doodle className="left-[19%] bottom-[20%] h-24 w-24 opacity-20" delay={1.4} tilt={4}>
          <Books />
        </Doodle>
        <Doodle className="right-[15%] top-[26%] h-20 w-20 opacity-20" delay={0.7} tilt={8}>
          <Pencil />
        </Doodle>
        <Doodle className="right-[18%] bottom-[22%] h-20 w-20 opacity-25" delay={2.1} tilt={-5}>
          <Sprig />
        </Doodle>
        <Doodle className="right-[26%] top-[12%] h-14 w-14 opacity-15" delay={1.8} tilt={10}>
          <Moon />
        </Doodle>
      </div>

      <Sparkle className="left-[30%] top-[18%] h-4 w-4 text-accent" delay={0} />
      <Sparkle className="right-[30%] bottom-[24%] h-5 w-5 text-accent" delay={1.2} />
      <Sparkle className="left-[24%] bottom-[34%] h-3 w-3 text-today" delay={2.4} />
      <Sparkle className="right-[24%] top-[36%] h-3 w-3 text-today" delay={3.1} />
      <Sparkle className="left-[46%] top-[9%] h-3 w-3 text-accent" delay={1.9} />
    </div>
  )
}
