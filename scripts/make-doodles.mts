/**
 * Generates the tiled doodle field behind conversations.
 *
 * Written as a generator rather than drawn by hand because the first attempt
 * was drawn by hand: twenty-seven shapes on a regular grid, every one upright
 * and the same size, with a globe that came out looking like a basketball. A
 * doodle field does not read as texture because of what the shapes are — at
 * this opacity you barely see them — it reads because of density, rotation and
 * varied scale, and those are things a loop is better at than I am.
 *
 * Deterministic: the same seed gives the same tile, so the background does not
 * change every time someone runs this.
 *
 *   npx tsx scripts/make-doodles.mts
 */

const SIZE = Number(process.env.DOODLE_SIZE ?? 320);
/**
 * Set by measurement against the reference rather than by eye.
 *
 * Ink coverage — the share of pixels darker than the beige ground — is what
 * separates a doodle field from scattered clip art, and eyeballing it produced
 * three wrong answers in a row: 52 motifs read as confetti, 20 as a few big
 * objects on empty ground, 40 as merely sparse. The reference sits at 22.8%
 * coverage; these settings measure 22.9%.
 *
 * Sweep it again with the DOODLE_* environment variables if the look changes.
 */
const COUNT = Number(process.env.DOODLE_COUNT ?? 200);
const SEED = 20260928;

/** Motifs drawn in a 0–24 box, centred on 12,12. Line art only, no fills. */
const MOTIFS: string[] = [
  // Passport
  "M7 3h10v18H7zM12 8.5a2.2 2.2 0 100 4.4 2.2 2.2 0 000-4.4M9 16h6M10 18h4",
  // Paper plane, with the fold that makes it read as one
  "M2 12l20-8-7 18-3.5-7zM11.5 15L22 4",
  // Globe: one meridian and one equator, not a basketball
  "M12 2a10 10 0 100 20 10 10 0 000-20M2 12h20M12 2c3.2 3 3.2 15 0 20M12 2c-3.2 3-3.2 15 0 20",
  // Document with a folded corner
  "M6 2h8l4 4v16H6zM14 2v4h4M9 12h6M9 16h6",
  // Stamp: perforated edge suggested by the notch
  "M4 5h16v14H4zM4 9h2M4 13h2M18 9h2M18 13h2M8 9h8v6H8z",
  // Clock
  "M12 3a9 9 0 100 18 9 9 0 000-18M12 7v5l3.5 2",
  // Briefcase
  "M3 8h18v12H3zM9 8V5h6v3M3 13h18",
  // A tapered tower
  "M12 2l3 6-1.2 13h-3.6L9 8zM8 21h8",
  // Location pin
  "M12 2a6.5 6.5 0 00-6.5 6.5C5.5 14 12 22 12 22s6.5-8 6.5-13.5A6.5 6.5 0 0012 2M12 6.2a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8",
  // Envelope
  "M2 5h20v14H2zM2 5l10 8 10-8",
  // Certificate with a ribbon
  "M4 3h16v12H4zM7 6h10M7 9h7M12 15l-2.5 6 2.5-1.6 2.5 1.6z",
  // Magnifier
  "M10.5 3a7.5 7.5 0 100 15 7.5 7.5 0 000-15M16 16l5 5",
  // Calendar
  "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M8 14h3M13 14h3",
  // Suitcase with a handle
  "M4 7h16v14H4zM10 7V4h4v3M4 12h16M9 21v1M15 21v1",
  // Key
  "M7 8a4 4 0 100 8 4 4 0 000-8M11 12h10M18 12v3M21 12v4",
  // Graduation cap
  "M2 8l10-4 10 4-10 4zM6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5",
  // Aeroplane, properly
  "M12 2c1 0 1.6 1.2 1.6 3v4.2l7.4 4v2.2l-7.4-2.2v4.6l2.4 1.7v1.6L12 20l-4-.9v-1.6l2.4-1.7v-4.6L3 13.4v-2.2l7.4-4V5c0-1.8.6-3 1.6-3",
  // A simple chat bubble, because that is what this is
  "M4 4h16v11H9l-5 4z",
];

/** mulberry32 — small, deterministic, good enough for scatter. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(): string {
  const random = rng(SEED);
  const placed: { x: number; y: number; r: number }[] = [];
  const parts: string[] = [];

  let attempts = 0;
  while (placed.length < COUNT && attempts < COUNT * 60) {
    attempts++;
    const scale = Number(process.env.DOODLE_MIN ?? 0.55) + random() * Number(process.env.DOODLE_SPAN ?? 0.45);
    const radius = 12 * scale;
    const x = random() * SIZE;
    const y = random() * SIZE;

    // Keep them apart, wrapping at the edges so the tile joins itself without
    // a seam of collisions.
    const clash = placed.some((p) => {
      const dx = Math.min(Math.abs(p.x - x), SIZE - Math.abs(p.x - x));
      const dy = Math.min(Math.abs(p.y - y), SIZE - Math.abs(p.y - y));
      // Packed tight. A generous gap is what leaves the bare patches.
      return Math.hypot(dx, dy) < (radius + p.r) * Number(process.env.DOODLE_GAP ?? 0.42);
    });
    if (clash) continue;

    placed.push({ x, y, r: radius });
    const motif = MOTIFS[Math.floor(random() * MOTIFS.length)];
    const angle = Math.round((random() * 60 - 30) * 10) / 10;

    // Drawn nine times, once per neighbouring tile, so a motif crossing an
    // edge appears on the other side. Without this every tile boundary is a
    // visible line of clipped shapes.
    for (const ox of [-SIZE, 0, SIZE]) {
      for (const oy of [-SIZE, 0, SIZE]) {
        const px = x + ox;
        const py = y + oy;
        if (px < -radius * 2 || px > SIZE + radius * 2) continue;
        if (py < -radius * 2 || py > SIZE + radius * 2) continue;
        const t = `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${angle}) scale(${scale.toFixed(2)}) translate(-12 -12)`;
        parts.push(`<path d="${motif}" transform="${t}"/>`);
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
    `<g fill="none" stroke="#0b3b36" stroke-width="${process.env.DOODLE_STROKE ?? 1.6}" stroke-linecap="round" stroke-linejoin="round" opacity="0.14">`,
    ...parts,
    `</g></svg>`,
  ].join("");
}

const svg = build();
console.log(svg);
console.error(`tile ${SIZE}px, ${svg.length} bytes raw`);
