# LifeOS — Design System

Style language: **Minimal + Calm + Engineering + Data + Premium**
(Linear × GitHub × Vercel × Apple Health — without copying any of them).
Dark-only. Numbers > charts > text.

## Color tokens

Defined once in `apps/web/src/styles/tokens.css` (Tailwind v4 `@theme`) and
mapped onto shadcn semantic vars in `apps/web/src/app/globals.css`.
**No component may contain a hex color literal** — all color flows through
tokens (enforced by grep).

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#0B0E14` | page background |
| `--color-surface-1` | `#11151D` | cards / sidebar |
| `--color-surface-2` | `#161B25` | elevated fills, empty heatmap cells, chip tracks |
| `--color-border` | `#242A36` | every 1px border |
| `--color-fg` | `#F4F6F8` | primary text, hero numbers |
| `--color-fg-secondary` | `#A1A8B3` | body text, descriptions |
| `--color-fg-muted` | `#697180` | decorative metadata only (see contrast rule) |
| `--color-brand` | `#6366F1` | accent: active nav, progress fills, readiness, All-view heatmap ramp, focus ring |
| `--color-brand-strong` | `#4F46E5` | **button backgrounds only** (contrast rule) |
| `--color-brand-soft` | `#1A1D3A` | subtle tinted fills |

Domain colors (identity only, M3 taxonomy): Learning `#4F8CFF` ·
English `#A970FF` · Coding `#FF9F43` · Health `#45D483` ·
Productivity `#2DD4BF` (teal).

Trend colors (the ONLY colors allowed for change semantics):
Improving `#45D483` · Stable `#A1A8B3` · Declining `#F07878`.

### Allocation invariants

1. **Trend ≠ domain.** A chart encoding *change over time* is trend-colored;
   a chart encoding *identity* (which domain) is domain-colored. The domain
   color appears only in the dot/chip; sparkline + delta use the trend color.
2. **Brand is sparse.** Active nav indicator, progress fills, readiness bar,
   focus ring, All-view heatmap. Not "everything that is interactive".
3. **Progress bars are always brand indigo** — even inside a domain card
   (the domain dot carries identity).

### Contrast findings (computed)

- `#A1A8B3` on `#0B0E14` ≈ 9.1:1 — safe for body text.
- `#697180` on `#0B0E14` ≈ 3.9:1 — **fails AA for small text**. Allowed only
  for decorative/redundant metadata: axis labels, units, "updated 2h ago",
  disabled states. Anything the user must read uses Secondary.
- `#F4F6F8` on `#6366F1` ≈ 4.1:1 — below AA for small labels, which is why
  **buttons use `brand-strong` #4F46E5** (`#F4F6F8` on it ≈ 5.8:1).
  `#6366F1` stays for fills/bars/indicators (3:1 non-text threshold).

## Typography

Geist (via `next/font/google`). Scale in `tokens.css`:

| Token | Size | Use |
|---|---|---|
| `text-hero` | 56px (48–64 band) | readiness hero number |
| `text-display` | 32px (28–36 band) | dashboard headline numbers |
| `text-h1` | 28px | page titles |
| `text-h2` | 20px | section headings |
| body | 14–16px | copy |
| `text-meta` | 13px | labels, units |
| `text-micro` | 12px | eyebrows, axis labels, footnotes |

Every metric number carries `.num` (tabular-nums) — no width jitter
between renders. Numbers come first: the user sees **72** before any prose.

## Cards

Every card is `Panel` (`components/primitives/panel.tsx`): Surface 1
background, 1px `#242A36` border, **14px radius, no shadow**, padding
20–24px (16px via `tight` for dense rows). No glassmorphism, no neon glow,
no big gradients. The product must stay quiet.

## Layout

- Desktop: fixed left sidebar **232px** (`bg-surface-1`, border-right),
  content max-width **1560px**. Mobile (<md): top bar with horizontally
  scrollable nav pills, no horizontal page overflow.
- Home first screen answers three questions in order: Goal Progress →
  domain row → Contribution Heatmap + Today → Me vs Me / Goals / Insights.

## Heatmap encoding (the #1 brand component)

- Intensity = **completion against that day's goal**, capped at 100% —
  studying 16h is never darker than 8h.
- 5 levels: 0% / 1–25 / 25–50 / 50–80 / 80–100. Level 0 = Surface 2
  (an empty day is a cell, not a hole). Ramps = domain hue mixed into
  Surface 2 (oklab 22/45/72/100%); the All view uses the brand ramp.
- Coding/productivity compare the trailing 7 days to their weekly goals.
- Health is excluded — sleep's target is a band, not a floor.
- The legend caption always travels with the heatmap: "Intensity = % of
  that day's goal · capped at 100%".

## Tone rules ("No judgment. Just evidence.")

- Allowed: Improving / Stable / Declining / "Below baseline" / "No study
  logged". Forbidden: bad, fail(ure), poor, worst, missed — enforced by
  grep; all tone-sensitive strings live in `apps/web/src/lib/copy.ts`.
- No "Life Score". The hero is **readiness against a chosen target**
  ("Overseas Engineer — 72% ready"), never a grade of the user.
- No percentile rankings. Benchmark language is strictly
  "You 50 · Target 85 · Gap 35 pts".
