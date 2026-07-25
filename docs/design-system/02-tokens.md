# Tokens

157 CSS custom properties, all defined in one `:root` in `node_modules/@corelithzw/react/dist/styles.css`.
Values below are the shipped literals. **Reference tokens, never literals** — if you are typing a hex, a px,
or a ms into new code, stop and find the token here.

```bash
# authoritative dump
awk '/^:root/,/^}/' node_modules/@corelithzw/react/dist/styles.css
```

## Colour

Governing rule: **saturated colour means action or state, never decoration.** Pick the semantic role token;
never reach past it to a raw `--gray-*`.

### Surfaces & structure

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#F7F8FA` | Page background |
| `--surface` | `#FFFFFF` | Raised panels, cards, inputs |
| `--surface-muted` | `#F1F3F6` | Hover, grouped areas |
| `--surface-sunken` | `#E8EBF0` | Deeper grouped areas |
| `--surface-deep` | `#DDE1E7` | Skeletons, divider blocks |
| `--border` | `#E5E8EE` | Default hairline — the workhorse |
| `--border-strong` | `#D2D7E0` | Emphasised separation |
| `--border-subtle` | `#EEF0F4` | Within-group rows |
| `--border-hover` | `#BFB9A8` | Interactive surface hover, pre-focus |
| `--hairline` | `rgba(22,24,29,.08)` | Translucent divider over unknown bg |

`--gray-50 100 200 300 400 500 600 700 800 900 950` exist for when a literal swatch is genuinely needed
(charts, illustrations). Not for text or surfaces — use the role tokens.

### Text

| Token | Value | Use |
|---|---|---|
| `--text-strong` | `#16181D` | Headings, primary values, emphasis |
| `--text-body` | `#262A33` | Body copy — the default |
| `--text-muted` | `#565C69` | Secondary explanatory text. **Never an action label** |
| `--text-subtle` | `#5E6573` | Timestamps, counts, de-emphasised meta |
| `--text-inverse` | `#FFFFFF` | On solid dark/brand fills |
| `--text-link` | `#0944C2` | Inline links |
| `--ink` / `--ink-soft` | `#16181D` / `#262A33` | Solid dark button fills, ink elements |

Muted text on a button reads as disabled. Don't.

### Brand — the only saturated colour

| Token | Value | Use |
|---|---|---|
| `--brand` | `#0B5DF0` | Primary action, focus ring. **One per surface** |
| `--brand-strong` | `#0944C2` | Hover |
| `--brand-deeper` | `#08379C` | Pressed |
| `--brand-soft` | `#E8EFFE` | Tinted backgrounds |
| `--brand-tint` | `rgba(11,93,240,.08)` | Selection wash |
| `--brand-50 …900` | scale | Charts, tinted borders |

`--clay`, `--clay-strong`, `--clay-soft`, `--clay-tint` are **legacy aliases pointing at `--brand`**.
They exist so old kit pages still render. Never use them in new code.

### Actions

| Token | Resolves to |
|---|---|
| `--action-primary-bg` / `-hover` / `-pressed` / `-fg` | `--brand` / `--brand-strong` / `--brand-deeper` / `#FFF` |
| `--action-secondary-bg` / `-bg-h` / `-fg` | `--surface` / `--surface-muted` / `--text-strong` |
| `--action-destructive-bg` / `-hover` / `-fg` | `#B83A2A` / `#A33324` / `#FFF` |
| `--action-destructive-soft-bg` / `-hover` | `#6B655A` / `#57524A` |

Use **soft destructive** (warm grey) for serious-but-reversible actions; reserve red for irreversible ones.

### Semantic tones

Each tone has `--tone-X` (foreground), `--tone-X-bg`, `--tone-X-bd`.

| Tone | fg | bg | Meaning — do not blur these |
|---|---|---|---|
| `info` | `var(--brand)` | `#E8EFFE` | Neutral information |
| `success` | `#5E8E54` | `#E7EFE0` | **Past tense.** Done, nothing pending |
| `warn` | `#B07626` | `#F4E6C5` | **Operator input needed.** Nothing broken yet |
| `danger` | `#B83A2A` | `#F6E2DD` | Destructive, or an error needing intervention |
| `neutral` | `var(--text-muted)` | `var(--surface-muted)` | No state |

`--tone-success-strong` `#2E5526` and `--tone-danger-strong` `#7A2419` are for **prose on a tinted
background** — the base tones only clear 3.84:1, which is AA Large / UI-only (badges, icons). Use the
strong variants for sentences.

Status dots: `--dot-attention` and `--dot-progress` (both brand), `--dot-ok` (success), `--dot-idle` (subtle).

### Focus

`--focus-ring` = `--brand`; `--focus-ring-soft` = `rgba(11,93,240,.22)`.
Rendered as 2px solid + 3px halo, on `:focus-visible` only.

### Contrast floors

Body text ≥ 4.5:1. Links and headings exceed 5:1. Never signal state by colour alone — pair with an icon
and a text label.

## Typography

One family; **weight does the work**. `--font-display` and `--font-serif` are aliases of `--font-sans`.

- `--font-sans` — Atkinson Hyperlegible Next, then `-apple-system`, Segoe UI, Helvetica Neue, Arial
- `--font-mono` — Atkinson Hyperlegible Mono, then ui-monospace, SF Mono, JetBrains Mono, Menlo, Consolas

Role tokens are complete `font:` shorthand — assign, don't decompose. Each has a matching `.t-*` utility class.

| Token | Class | Value | Use |
|---|---|---|---|
| `--type-display` | `.t-display` | 700 56/1.04 | Marketing hero only |
| `--type-display-sm` | `.t-display-sm` | 600 32/1.15 | Large stat hero |
| `--type-page-title` | `.t-page-title` | 600 22/1.3 | Page `<h1>` |
| `--type-section-title` | `.t-section` | 600 16/1.4 | Section + card titles |
| `--type-body-lg` | `.t-body-lg` | 400 16/1.55 | Long-form prose |
| `--type-body` | `.t-body` | 400 14/1.55 | **Default body** |
| `--type-body-sm` | `.t-body-sm` | 400 13/1.5 | Dense rows |
| `--type-label` | `.t-label` | 500 14/1.4 | Form labels |
| `--type-label-sm` | `.t-label-sm` | 500 13/1.4 | Compact labels |
| `--type-caption` | `.t-caption` | 400 12/1.45 | Helper, captions |
| `--type-eyebrow` | `.t-eyebrow` | 500 12/1.3 | Section eyebrow — **not** all-caps |
| `--type-table-head` | — | 500 12/1.3 | `<th>` |
| `--type-mono` | `.t-mono` | 500 12/1.5 mono | IDs, timestamps, money |

Also: `.t-strong` `.t-muted` `.t-subtle` `.t-brand` for colour-only shifts.

Rules: sentence case for headings and buttons. ALL CAPS never, eyebrows included. Emphasise by moving
500→600, never by switching family. **Set `font-variant-numeric: tabular-nums` anywhere a number can change**
— live counters, table columns, totals.

## Spacing — 4px base, 8px rhythm

`--space-px` 1 · `-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-7` 32 · `-8` 40 · `-9` 48 ·
`-10` 64 · `-11` 80 · `-12` 96 · `-13` 128

> ⚠ This repo's `--space-8` is 32px and `--space-10` is 40px. Different scale. See `01-setup.md`.

Also `--gutter-x` 24px (page gutter per side), `--row-y` 12px (list/table row padding).

| Situation | Value |
|---|---|
| Sibling cards in a column, field rows | `--space-4` (16) |
| Section → section | `--space-7` (32) tight, `--space-9` (48) default |
| Field group internals | `--space-1` (4) |
| Page gutter | ≤430px: 16 · 431–767: 20 · ≥768: 24 |

Card padding mirrors the page gutter at that viewport.

Principle: **generous air over hairline borders** — reach for space before adding a divider.

## Radius

`--radius-xs` 4 · `-sm` 6 · `-md` 8 · `-lg` 10 · `-xl` 14 · `-2xl` 18 · `-pill` 9999
Semantic: `--button-radius` 8, `--card-radius` 12. Never 0 — nothing in this system has sharp corners.

## Control heights

`--h-control-xs` 24 · `-sm` 30 · `-md` 36 (default) · `-lg` 44 (mobile-primary)
`--input-height` and `--button-height` both alias `--h-control-md`.

36px clears the WCAG 24px floor. Mobile-primary surfaces use 44. Dense tables may drop to 30, or 24 with
4px clear space around the target.

## Shadows — earned, not decorative

> "A border separates two surfaces at rest. A shadow only appears when something is floating."

| Token | Surface |
|---|---|
| `--shadow-none` | **Cards and panels at rest.** Use `--border` instead |
| `--shadow-rest` | `0 1px 0` — barely-there lift |
| `--shadow-hover` | Interactive card hover |
| `--shadow-popover` | Dropdowns, menus, date pickers, autocomplete |
| `--shadow-modal` | Modal dialogs only |
| `--shadow-bar-bottom` | Upward shadow — bottom tab bar, sticky save bar |
| `--shadow-sheet-bottom` | Bottom sheet — deeper, longer throw than a bar |
| `--shadow-inset-rest` / `-soft` | Active segmented-control / tab item |
| `--shadow-thumb` | Switch knob |

Never shadow several static cards — it flattens hierarchy instead of building it.

## Motion

| Token | ms | Use |
|---|---|---|
| `--dur-instant` | 80 | Tooltips, instant feedback |
| `--dur-fast` | 140 | Hover, button press |
| `--dur-base` | 200 | Popovers, modals |
| `--dur-slow` | 320 | Side sheets, section reveals |
| `--dur-slower` | 480 | Full-screen transitions |
| `--dur-page` | 640 | Page-level orchestration |

| Easing | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Entrances |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | Bidirectional movement |
| `--ease-spring` | `cubic-bezier(.5,1.8,.3,1)` | Deliberate overshoot |
| `--ease-snap` | `cubic-bezier(.7,0,.3,1)` | Instant corrections |

Utilities: `.anim-fade-in` `.anim-fade-up` `.anim-scale-in` `.anim-slide-right` `.anim-pulse`,
staggered with `.anim-delay-1` … `.anim-delay-6`.

Animate **`transform` and `opacity`** freely. With care: `filter`, `background-color` on small elements,
`color` on text. **Never** `width`/`height`/`top`/`left`/`margin`, or large surface backgrounds.

`prefers-reduced-motion: reduce` forces `animation-duration: 0.01ms !important`; entrances snap to their
final frame. Do not defeat this.

## Layout

`--sidebar-w` 264 · `--sidebar-w-narrow` 240 · `--rail-w` 220 (settings rail) · `--content-max` 900
(forms/settings column). Data-heavy pages go to 1300px.

## Internal — do not use

`--btn-loading-ink` `--fill` `--pct` `--size` `--track` are component internals with no `:root` default.

## Icons

Not a package — a hand-rolled Lucide-style set of ~100 icons.

24×24 grid · 1.6px stroke · round caps and joins · no fill · `currentColor` only · default 16px, with
slots at 14/16/18/22/28/40.

The DS delivers them via an `icons.js` helper (`<span data-icon="name">`, inflated on `DOMContentLoaded`)
that is **not part of the React package**. This repo uses `@phosphor-icons/react` instead. Keep Phosphor —
it is React-native and SSR-safe — but constrain it to the spec above: `size={16}`, `currentColor`, and
Phosphor's `regular` weight, which matches the 1.6px stroke most closely. Do not adopt the
`DOMContentLoaded` helper in a Next.js app.
