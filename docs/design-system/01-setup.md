# Setup & integration

All facts below were verified against the installed package and this repo, not read off the website.

## Installed state

`@corelithzw/react@0.3.0` is in `package.json` dependencies. Nothing else is needed — do not copy
`tokens.css` / `components.css` / `icons.js` off the website.

| Fact | Value |
|---|---|
| Peer deps | `react ^18 \|\| ^19`, `react-dom ^18 \|\| ^19` — repo has React 19.2.3 ✓ |
| Runtime deps | none |
| Entry | ESM `dist/index.js`, CJS `dist/index.cjs`, types `dist/index.d.ts` |
| Stylesheet | `@corelithzw/react/styles.css` — **the only import you need** |
| Typecheck | Verified clean under this repo's TS 5.9 + React 19 + `moduleResolution: bundler` |

### `styles.css` is self-sufficient — verified

- It is a **superset** of the website's `components.css`: 635 class names vs the site's 586, with **zero**
  classes present on the site but missing from the package. Same for tokens (identical, plus 5 internal ones).
- `dist/react.css` also exists but is a **redundant subset** — its runtime overlay rules
  (`.x-modal-overlay`, `.toast-stack`, `.lightbox-backdrop`, `.file-upload`, `.mobile-shell`,
  `.date-picker-popover`, …) are already appended, minified, to `styles.css`. It is not in the package
  `exports` map. **Do not import it.**
- `styles.css` line 14 pulls Atkinson Hyperlegible Next + Mono from Google Fonts via `@import url(...)`.
  Offline/CSP-restricted builds fall back to `-apple-system` and lose the intended metrics.

## Two blocking gotchas

### 1. No `"use client"` — you must add it

The dist bundle contains **zero** `"use client"` directives but uses `useState`, `useEffect`, and `document`.
Importing any DS component into a Next.js Server Component throws.

Every file importing from `@corelithzw/react` needs `"use client"` at the top. If a Server Component needs
DS markup, wrap it in a thin client child rather than adding `"use client"` up the tree.

```tsx
"use client";
import { Button, DataTable } from "@corelithzw/react";
```

### 2. Token name collisions with `app/globals.css`

39 of the DS's 157 tokens already exist in `app/globals.css` under the same names with **different values**.
Importing `styles.css` after `globals.css` silently reflows existing UI. These are the ones that change size
or shape — the dangerous set:

| Token | This repo | Design system | Consequence |
|---|---|---|---|
| `--space-8` | 32px | **40px** | Scale divergence — see below |
| `--space-10` | 40px | **64px** | Scale divergence — see below |
| `--button-radius` | 11px | 8px | Every button gets squarer |
| `--radius-sm` / `md` / `lg` / `xl` / `2xl` | `calc()` off `--radius` | 6 / 8 / 10 / 14 / 18px | Radius scale replaced |
| `--button-height` / `--input-height` | `2.25rem` | `var(--h-control-md)` = 36px | Same size, different mechanism |
| `--font-sans` | `var(--font-sans)` → "SS Huchu" | Atkinson Hyperlegible Next | **Whole-product typeface change** |
| `--shadow-popover` | `0 8px 24px …` | `0 12px 32px -8px …` | Deeper popovers |

**The spacing scale is the real trap.** This repo indexes roughly by 4×n; the DS indexes by step. They agree
through `--space-6` and diverge after:

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| repo | 4 | 8 | 12 | 16 | 20 | 24 | — | **32** | — | **40** | — | — | — |
| DS | 4 | 8 | 12 | 16 | 20 | 24 | 32 | **40** | 48 | **64** | 80 | 96 | 128 |

So repo `--space-8` (32px) is DS `--space-7`, and repo `--space-10` (40px) is DS `--space-8`. Any existing
rule using `--space-8` or `--space-10` shifts if the DS values win.

The remaining collisions (`--text-*`, `--border*`, `--action-*`, `--focus-ring`, `--surface-muted`) are
indirection-only: the repo aliases its own palette, the DS uses literals. Resolved values are close, so they
are low-risk — but they are the seam where the two colour systems meet.

### Dark mode

The DS ships **no** `prefers-color-scheme` or `.dark` block — verified, zero matches across all package CSS.
`app/globals.css` has dark-mode handling. Any surface migrated to raw DS tokens loses dark mode.
Options: keep the repo's dark overrides layered on top and re-map DS tokens inside them, or scope the DS to
light-only surfaces. Do not assume the DS handles it. The site's colours page claims surfaces flip in dark
mode; the shipped CSS does not implement that.

## Recommended adoption order

Scoped, reversible, and it keeps the collision surface small.

1. **Do not** import `styles.css` globally into `app/layout.tsx` yet — that fires all 39 collisions at once.
2. Add the DS's non-colliding tokens (118 of them) to `app/globals.css` under their own names. `--brand-*`,
   `--tone-*`, `--type-*`, `--dur-*`, `--ease-*`, `--h-control-*`, `--gray-*`, `--space-7/9/11/12/13`,
   `--sidebar-w`, `--gutter-x` — all safe, all additive.
3. Migrate route-by-route. Import `styles.css` inside the migrated subtree, or accept it globally only once
   the collision table above has been reconciled deliberately.
4. Reconcile spacing before anything else: rename repo `--space-8` → `--space-7` and `--space-10` → `--space-8`
   at every use site, then adopt the DS scale wholesale. Do this as one mechanical commit with no other changes.
5. Decide the typeface explicitly. "SS Huchu" vs Atkinson Hyperlegible is a product decision, not a
   refactor detail — flag it, don't silently switch it.
6. Delete the local `components/ui/*` equivalent only after its DS replacement is proven at every call site.
   See `07-repo-migration.md`.

## Verified environment notes

- Breakpoints in `styles.css` are `max-width`-first: 320, 380, 460, 480, 520, 560, 600, **720**, 760, 900,
  1100, 1200px. 720px is the dominant phone/desktop split; 900/1100/1200 handle shell collapse.
  These are **not** Tailwind's defaults — don't mix the two on one component.
- The repo already carries `@base-ui/react`, six `@radix-ui/*` packages, `@rtcamp/frappe-ui-react`,
  `@tanstack/react-table`, and `@visx/*`. The DS overlaps all of them. Migrating a component means
  **removing** the old dependency's usage, not layering DS on top.
- The DS's own charts (`Chart.Line|Bar|Donut|Sparkline`) are deliberately minimal SVG. The repo's `@visx/*`
  charts are more capable. Do not downgrade a working visx chart to `Chart.*` without checking the
  20 chart recipes in `06-reference-urls.md` for whether the needed form exists at all.
