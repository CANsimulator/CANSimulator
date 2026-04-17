# Design System: CAN Simulator — ISO 11898 Protocol Workstation

## 1. Visual Theme & Atmosphere

A high-density cockpit interface with the presence of a laboratory-grade protocol analyzer. The atmosphere is cold, precise, and mechanically alive — like standing in front of a rack-mounted Tektronix oscilloscope bank in a dimly lit automotive EMC test chamber. Every pixel serves a diagnostic purpose. There is no decoration for decoration's sake.

**Taste Calibration:**
- **Density:** 8/10 — Cockpit Dense. Information is compressed, prioritized, and scannable. Whitespace exists only where it improves legibility of critical data.
- **Variance:** 7/10 — Offset Asymmetric. Sidebar-heavy control panels, asymmetric grids, structural hairlines. No centered balanced layouts.
- **Motion:** 7/10 — Cinematic Choreography. Perpetual micro-motion on active data (pulsing status LEDs, shimmering hex fields, cascade-mounted log rows). The interface breathes.
- **Creativity:** 6/10 — Domain-constrained. Creative expression serves the engineering domain. The aesthetic is "expensive test equipment" not "sci-fi movie prop."

**Glassmorphism Specification:**
All elevated surfaces use semi-transparent fills with frosted-glass blur. This creates a layered depth hierarchy without relying on heavy drop shadows.
- Surface fill: `rgba(18, 19, 20, 0.9)` in dark mode, `rgba(255, 255, 255, 0.9)` in light mode
- Blur radius: `24px` (`backdrop-blur-2xl`)
- Border: `1px solid rgba(255, 255, 255, 0.10)` (dark) or `1px solid rgba(187, 201, 204, 0.15)` (light)
- Corner radius: `0.75rem` (12px) — tight and technical, not bubbly
- CSS class: `.glass-panel`

---

## 2. Color Palette & Roles

### Neutral Foundation (Slate family — no warm/cool gray fluctuation)
- **Deep Void** (`#020617`) — Primary canvas background. Slate-950 depth. Never `#000000`.
- **Panel Surface** (`#0a0a0f`) — Secondary surface for nested panels and recessed areas.
- **Elevated Glass** (`#131318`) — Card and container fill when glassmorphism is not applied.
- **Structural Zinc** (`#1e1e2d`) — Grid lines inside the oscilloscope canvas, internal dividers.
- **Muted Steel** (`#71717a`, Zinc-500) — Inactive labels, metadata timestamps, placeholder text.
- **Ghost Border** (`rgba(255, 255, 255, 0.05)`) — Panel borders, 1px structural separation lines.
- **Readable White** (`#e2e8f0`, Slate-200) — Primary body text. High contrast against Deep Void.

### Functional Accents

> **Domain Override Note:** The taste-design spec limits accents to 1. This project uses 2 accent colors because they map to the physical CAN bus channels defined in ISO 11898: CANH (cyan) and CANL (purple). This is engineering convention, not decorative choice. Both colors carry semantic meaning throughout the interface and cannot be reduced.

- **CANH Cyan** (`#00f3ff`) — Primary accent. Channel 1 waveforms, active states, focus rings, primary CTAs, link hover states. The signature color.
- **CANL Purple** (`#bf00ff`) — Secondary accent. Channel 2 waveforms, secondary alerts, protocol depth identifiers (EOF, ACK fields).
- **Compliance Green** (`#00ff9f`) — ISO compliance passes, valid packets, "Ready" system states, positive confirmations.
- **Drift Amber** (`#ffd000`) — Non-critical warnings: bus load intensity bars, timing drift, DLC field highlights.
- **Fault Red** (`#ff4444`) — NRC errors, bus-off states, physical layer shorts, CRC failures. Never decorative.
- **Packet Orange** (`#ff8800`) — CRC field decoder highlights, mid-severity alerts.

### Color Constraints
- Saturation on accents stays below 100% in practice: the neons read bright against the dark canvas but never bleed into adjacent elements.
- Accent colors are NEVER used for large fills. They appear as text color, 1px borders, tiny status dots, and constrained box-shadows (max `4px` blur, `0.3` opacity).
- All accent backgrounds use extreme transparency: `bg-[#00f3ff]/10` (10% opacity fills) for selected states.

---

## 3. Typography Rules

### Font Stack
- **Display / Headlines:** `Outfit` — Track-tight (`letter-spacing: -0.02em`), uppercase, weight 900 (Black). Hierarchy through weight and color, not raw size. Headlines stay controlled: `clamp(1.25rem, 2vw, 2rem)`.
- **Body / Descriptions:** `Outfit` — Regular weight (400), relaxed leading (`line-height: 1.6`), max `65ch` per line. Secondary text uses Muted Steel (`#71717a`).
- **Protocol Mono:** `JetBrains Mono` — **MANDATORY** for: all HEX data, memory addresses, bit indices, voltage readings, timestamps, CAN IDs, NRC codes, byte sequences, and any numeric metric. Weight 700–900 for emphasis. Size: `9px`–`11px` with `tracking-widest` for instrument-grade readability.

### Scale Hierarchy
| Level | Size | Weight | Tracking | Use Case |
|-------|------|--------|----------|----------|
| Section Title | `10px` | 900 | `0.2em` | Panel headers ("SYSTEM HEALTH", "SIGNAL ANALYSIS") |
| Metric Label | `8px`–`9px` | 700 | `0.1em`–`0.25em` | "Eye Width", "Rise Time", "CH1 Vpp" |
| Metric Value | `14px`–`20px` | 900 | normal | The actual numbers: "88%", "2.34V" |
| Metadata | `9px` | 600 | `0.05em` | Timestamps, secondary info, status text |

### High-Density Override
Density exceeds 7, therefore: **ALL numbers, voltages, percentages, and timing values MUST use `JetBrains Mono`**. No exceptions. This includes button labels that contain numeric values.

### Banned Fonts
- `Inter` — Generic, overused in AI-generated interfaces.
- `Times New Roman`, `Georgia`, `Garamond`, `Palatino` — Serif fonts are banned in this dashboard context.
- System default sans-serif stack without explicit font specification.

---

## 4. Hero Section (Landing Page Only)

The landing page hero must feel like booting into a diagnostic workstation, not browsing a SaaS marketing page.

- **Structure:** Left-aligned or asymmetric split. Centered hero layouts are BANNED (variance exceeds 4).
- **Headline:** Large `Outfit` display text. May include inline SVG illustrations of CAN bus waveforms between words.
- **CTA Restraint:** Maximum one primary CTA button ("Launch Simulator"). No secondary "Learn More" links.
- **No filler text:** "Scroll to explore", scroll arrows, bouncing chevrons are BANNED. Content pulls users in through technical substance.
- **No overlapping:** Text never overlaps images or other text. Every element occupies its own spatial zone.

---

## 5. Component Stylings

### Containers / Panels
- Glassmorphic surfaces using `.glass-panel` class (see Section 1)
- Corner radius: `0.75rem` (12px). Tight and technical.
- Internal padding: `1rem` (16px) standard, `0.5rem` (8px) for compact metric boxes.
- When nesting panels inside panels, reduce to `.glass-card` (lighter blur, thinner border).
- For extreme density: replace cards entirely with `border-top: 1px solid rgba(255,255,255,0.05)` dividers.

### Buttons
- **Primary:** Flat fill with accent color at `10%` opacity, `1px` accent border at `20%` opacity, text in full accent color. On hover: fill increases to `20%`. On active: `-1px` translateY for tactile push.
- **Ghost / Secondary:** Transparent background, `white/40` text, `white/5` hover fill. Border: transparent.
- **Shape:** Tight rectangles with `0.25rem`–`0.5rem` radius. No pills, no generously rounded corners.
- **Typography:** `JetBrains Mono`, `9px`–`10px`, weight 900, uppercase, `tracking-widest`.
- **Glow constraint:** Maximum `4px` box-shadow blur in accent color at `0.3` opacity. No outer glow halos.
- **No custom mouse cursors.**

### Inputs & Controls
- Dark background (`white/5`), `1px` border (`white/10`).
- On focus: border transitions to accent color, subtle glow ring (`0 0 0 1px #00f3ff`).
- Labels: positioned above the input as small (`8px`) uppercase mono text in `white/30`.
- Range sliders: thin track (`4px`), accent-colored thumb.
- Error text: below input, in Fault Red, mono.

### Status Indicators
- Tiny dots (`6px`–`8px` diameter) with accent-matched `box-shadow: 0 0 4px [color]`.
- PASS/FAIL badges: `9px` mono uppercase text on `10%` opacity accent background, tight padding.
- Active pulsing: `opacity` animation between 0.4 and 1.0 on running states (Framer Motion).

### Data Tables / Logs
- Header row: `8px` mono, uppercase, `white/30`, no background.
- Data rows: `9px`–`10px` mono, `white/80`. Alternate row tint: `white/[0.02]`.
- Row hover: `white/5` background transition.
- Protocol field highlights: inline colored text matching decoder strip colors (ARB ID in cyan, DLC in amber, CRC in orange).

### Loaders
- Segmented progress bars or byte-stream fill animations.
- Skeletal shimmers matching exact layout dimensions for async panel loading.
- **No circular spinners.** Ever.

### Empty States
- Composed, minimal compositions with a muted icon and single-line instruction.
- Not just "No data" text. Show the user exactly what action populates this area.

### Error States
- Inline, not modal. Fault Red text with mono font.
- For critical bus errors: full-width banner at panel top with `bg-[#ff4444]/10` and border.

---

## 6. Layout Principles

### Grid Architecture
- **Primary Layout:** CSS Grid. `grid-cols-[300px_1fr_320px]` for the oscilloscope cockpit (left controls, center canvas, right metrics).
- **Never** use `calc()` percentage hacks or flexbox math for primary layout structure.
- Structural lines: ultra-thin (`0.5px`–`1px`) `#1e1e2d` borders as section separators instead of large whitespace gaps.
- Max-width containment: `1600px` centered for the main dashboard viewport.
- Full-height sections: `min-h-[100dvh]`, NEVER `h-screen` (iOS Safari viewport jump).

### Spatial Hierarchy
- No overlapping elements. Every component occupies its own clear spatial zone.
- No absolute-positioned content stacking for layout purposes (acceptable only for canvas overlays and tooltips).
- Generous internal padding within panels (`1rem`), but tight gaps between panels (`1.5rem`).
- The "3 equal cards horizontally" feature row is BANNED. Use 2-column asymmetric grids, zig-zag layouts, or sidebar-heavy arrangements.

---

## 7. Responsive Rules

### Breakpoints (from `tailwind.config.js`)
| Token | Width | Behavior |
|-------|-------|----------|
| `xs` | 375px | Minimum supported. Single column. |
| `sm` | 640px | Small mobile. Single column persists. |
| `md` | 768px | Tablet. 2-column grids begin. |
| `lg` | 1024px | Desktop. Full cockpit layout activates. |
| `xl` | 1280px | Wide desktop. Comfortable spacing. |
| `2xl` | 1536px | Ultra-wide. Max-width containment kicks in. |

### Collapse Rules
- **Below 1024px:** The 3-panel cockpit grid (`controls | canvas | metrics`) collapses to stacked single-column layout.
- **Below 768px:** All multi-column layouts collapse to single column. No exceptions.
- **No horizontal scroll.** Horizontal overflow on any viewport is a critical failure.
- **Touch targets:** All interactive elements minimum `44px` tap target on mobile.
- **Typography scaling:** Headlines scale via `clamp()`. Body text never below `14px`.
- **Section spacing:** Reduce proportionally with `clamp(1.5rem, 4vw, 3rem)`.

---

## 8. Motion & Interaction

### Engine: Framer Motion (React)
All transitions use Framer Motion's spring physics. CSS `transition` is acceptable for simple color/opacity changes only.

### Spring Physics Default
```
stiffness: 120, damping: 25
```
Weighted, mechanical feel. Like a precision instrument's knob clicking into place. Never linear easing. Never `ease-in-out` for interactive elements.

### Perpetual Micro-Interactions (the UI must breathe)
- **Status LED Pulse:** Running indicators animate opacity `[0.4, 1, 0.4]` on infinite repeat with `duration: 1.5s`.
- **Data Shimmer:** Active hex fields receive a subtle cyan shimmer (`background-position` animation).
- **Panel Bloom:** When a panel expands or modal opens, `backdrop-blur` increases from `0px` to `24px`.
- **Cascade Reveals:** Tables and log entries mount line-by-line with `20ms` staggered delays using Framer Motion's `staggerChildren`.

### Performance Constraints
- Animate ONLY `transform` and `opacity`. Never animate `top`, `left`, `width`, `height`, `margin`, or `padding`.
- Grain/noise texture effects: apply to fixed pseudo-elements only, never to scrolling content.
- Respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation: none !important;
      transition: none !important;
    }
  }
  ```

---

## 9. Anti-Patterns (Banned — the "AI Tells" List)

### Visual
- **NO pure black (`#000000`).** Use Deep Void (`#020617`) or Panel Surface (`#0a0a0f`).
- **NO neon outer glows** beyond `4px` blur at `0.3` opacity. The glow classes (`.shadow-neon`, `.shadow-neon-purple`) exist in the Tailwind config but should be used sparingly on small elements only (status dots, active tab indicators).
- **NO oversaturated accent fills.** Accents appear as text color, thin borders, and `10%` opacity backgrounds. Never as solid block fills.
- **NO gradient text** on large headers. Subtle gradients acceptable only on the landing page brand mark.
- **NO 3-column equal card layouts.** Use asymmetric grids, sidebar-heavy layouts, or horizontal scroll.
- **NO centered Hero sections.** Force left-aligned or asymmetric split.
- **NO overlapping elements.** Clean spatial separation always.

### Typography
- **NO `Inter` font.** Replaced with `Outfit` for display and body.
- **NO generic serif fonts.** Serif is banned in this dashboard context entirely.
- **NO `LABEL // YEAR` formatting** ("SYSTEM // 2024"). Use clean uppercase mono labels without decorative separators.

### Content
- **NO emojis.** Anywhere. Use Lucide icons exclusively.
- **NO AI copywriting clichés:** "Elevate", "Seamless", "Unleash", "Next-Gen", "Empower", "Revolutionary." Use domain-specific technical language: "Simulate", "Analyze", "Inject", "Decode", "Configure."
- **NO filler UI text:** "Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons.
- **NO fabricated data or statistics.** Never generate fake metrics, uptime percentages, response times, or performance numbers. If real data is unavailable, use placeholder labels like `[metric]` or live-computed values from the simulation engine.
- **NO fake system/metric sections** with invented dashboard data ("18.5k DEPLOY CYCLES", "99.98% UPTIME SLA").
- **NO generic placeholder names** ("John Doe", "Acme Corp", "Nexus Systems").
- **NO fake round numbers** (`99.99%`, `50%`). Real data only.

### Technical
- **NO custom mouse cursors.** Standard pointer and crosshair only.
- **NO broken Unsplash/image links.** Use `picsum.photos` for placeholders or inline SVG.
- **NO `h-screen`.** Use `min-h-[100dvh]` for full-height sections.
- **NO `calc()` percentage hacks** for layout. Use CSS Grid.

---

## 10. Accessibility (WCAG AAA Target)

This project targets WCAG 2.1 AAA compliance. Design decisions must support:

- **Color contrast:** All text meets 7:1 contrast ratio against its background. Accent-colored text on dark backgrounds is validated: `#00f3ff` on `#020617` = 11.2:1.
- **Focus indicators:** Visible `2px` focus rings in accent color on all interactive elements. Never `outline: none` without a replacement.
- **Semantic HTML:** Use `<section>`, `<aside>`, `<main>`, `<nav>`, `<header>` appropriately. All icon-only buttons have `aria-label`.
- **Reduced motion:** Entire animation system disables when `prefers-reduced-motion: reduce` is active (already implemented in `index.css`).
- **High contrast mode:** Alternative token overrides for forced-colors media query.
- **Minimum text size:** `9px` floor for instrument labels (with `line-height: 1.4` and `letter-spacing: 0.05em` compensation). Body text floor: `14px`.
