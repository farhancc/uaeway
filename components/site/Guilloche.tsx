/**
 * Guilloche: the engine-turned rosette engraved on banknotes, share
 * certificates, degree certificates and visa pages.
 *
 * It is the right ornament for this business because it is the ornament of the
 * documents themselves — not decoration borrowed from somewhere else. Drawn as
 * maths rather than an image file, so it costs no bytes, scales without
 * blurring, and cannot be mistaken for stock art.
 *
 * The curve is a hypotrochoid: a point at distance `d` from the centre of a
 * circle of radius `r` rolling inside a circle of radius `R`. Several of them
 * at slightly different ratios give the interference pattern engravers use.
 */

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * One closed rosette as an SVG path, centred on the origin.
 *
 * Point count is derived from the number of lobes rather than fixed, because
 * this markup ships inside the HTML of every page that shows it. At a flat 900
 * points the engraving was 38% of the home page's bytes, which is a bad trade
 * for ornament on a site whose readers are mostly on phones. Five points a lobe
 * is smooth at any size it is displayed, and one decimal place is finer than a
 * device pixel here.
 */
function rosette(R: number, r: number, d: number, perLobe = 5): string {
  const divisor = gcd(R, r);
  // The curve closes after the rolling circle has gone round this many times.
  const turns = r / divisor;
  const lobes = R / divisor;
  const steps = Math.max(120, Math.round(lobes * perLobe));
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const k = (R - r) / r;
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return `M${points.join("L")}Z`;
}

/**
 * Ratios chosen for a dense, even weave rather than a sparse star.
 *
 * Every hypotrochoid leaves a hole of radius |R - r - d| at its centre, and
 * with only wide rings that hole reads as a smudge. The tighter pairs at the
 * end nest inside it, which is also how an engraver builds a real medallion.
 */
const RINGS: { R: number; r: number; d: number; opacity: number }[] = [
  { R: 100, r: 17, d: 74, opacity: 0.55 },
  { R: 100, r: 23, d: 66, opacity: 0.4 },
  { R: 82, r: 13, d: 58, opacity: 0.45 },
  { R: 64, r: 11, d: 44, opacity: 0.35 },
  // The inner nest closes the centre. These are cheap: point count follows lobe
  // count, and a small ring has few lobes, so they cost a fraction of the wide
  // ones while doing the work that stops the middle reading as a smudge.
  { R: 44, r: 9, d: 31, opacity: 0.4 },
  { R: 27, r: 5, d: 19, opacity: 0.45 },
  { R: 14, r: 3, d: 10, opacity: 0.5 },
];

/**
 * Without a mask the rosette ends at the vertical tangent of its outer ring,
 * which reads as a ruled line rather than an engraving. Fading it out lets it
 * emerge from the margin the way it does on a real document.
 */
const FADE = "linear-gradient(to left, #000 0%, #000 30%, transparent 88%)";

export function Guilloche({
  className,
  /** Ink strength. Omit it to set opacity from `className` instead, which is
   *  how the hero keeps the engraving lighter on a phone, where it covers far
   *  more of the screen relative to the text. */
  opacity,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      viewBox="-110 -110 220 220"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ ...(opacity === undefined ? {} : { opacity }), maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.35" vectorEffect="non-scaling-stroke">
        {RINGS.map((ring) => (
          <path
            key={`${ring.R}-${ring.r}-${ring.d}`}
            d={rosette(ring.R, ring.r, ring.d)}
            strokeOpacity={ring.opacity}
          />
        ))}
        <circle cx="0" cy="0" r="104" strokeOpacity="0.5" />
        <circle cx="0" cy="0" r="100.5" strokeOpacity="0.3" />
      </g>
    </svg>
  );
}

/** The same engraving used small, as a mark rather than a field. */
export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="-110 -110 220 220" aria-hidden="true" focusable="false" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d={rosette(100, 17, 74, 6)} strokeOpacity="0.85" />
        <circle cx="0" cy="0" r="106" strokeOpacity="0.9" />
      </g>
    </svg>
  );
}
