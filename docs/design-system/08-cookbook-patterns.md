# Cookbook patterns — the shapes to build to

Distilled from the recipes at `https://design.corelith.co.zw/cookbook/`, pinned because these are
the patterns this repo's screens are expected to match. `06-reference-urls.md` is the full index;
this file is the part worth carrying between tasks so the page is right the first time.

**These are examples, not templates.** Adapt them to the screen. The rule that never bends is the
source-of-truth order from `README.md`: `index.d.ts` > `styles.css` > these docs > the website.

---

## Universal rules

- **One search box per screen.** Search lives in the toolbar, feeds one `filters` object
  (`{ search, status, sort, page }`), and is URL-synced. A page-level search plus a table-level
  search is the failure this rule exists to prevent — route every change through one hook and the
  temptation disappears.
- **Debounce search 300ms.** Filter chips fire immediately; only the text input waits.
- **Mobile is a different shell, not a hidden one.** Render the list *or* the table, never both
  with `display: none` — duplicated DOM confuses screen readers. Switch at **720px** using
  `matchMedia` with a listener, not `window.innerWidth`.
- **Define column metadata once** (key, label, format, `showOnMobile`) and feed both shells from
  it, so the card list and the table cannot drift.
- **The whole row is the link**, not the chevron — a 44pt thumb target has to survive.
- Interactive things are `<button>`, never `<div onClick>`. Tab order follows reading order.

---

## Dashboards — KPI hero + drilldown

The shape: **StatHero → KpiGrid → RowCard list → EmptyState.**

- One brand-tinted hero KPI carrying a delta and a sparkline. Two heroes side by side
  (`grid-template-columns: 1fr 1fr`) only when the two numbers are genuinely equal in weight.
- Three secondary metrics under it in neutral tone.
- Then the drill targets: `RowCard`s with live values and a chevron, each linking somewhere real.
- **Compute deltas against one snapshot, once.** Three views computing their own deltas is how
  they end up disagreeing.
- A missing baseline renders `—`, never `0%`.
- Label is an `h2` with the value as a descendant, so screen readers announce them together.
- Loading: `Skeleton` with `aria-busy="true"` in a polite live region.
- Empty: keep the page's shape — a muted hero shell plus one focusable primary CTA.

## Kanban board

- Columns are real `role="list"` regions; each card is `role="listitem"`.
- `KanbanBoard` › `Column` › `RowCard`, with a `Menu` on each card offering "move to…" so the
  board is usable without dragging (and on a touch screen).
- WIP limits render as a badge in the column header (`4/3` form).
- Add/edit happens in a `Drawer`, not inline.

## Filterable data table

- Toolbar has three zones: search input, filter chips, and a bulk-action zone.
- **The toolbar morphs on selection** — chips collapse and bulk actions take their place. It does
  not grow a second row.
- Toolbar is sticky on scroll.
- Per-row actions live in a kebab menu; cross-row actions live in the morphed toolbar.

## Command palette (⌘K)

- Trigger lives in the **top bar**, `aria-label="Open command palette"` — keyboard and touch parity.
- Every entry — page, action, recent, doc — is the same record shape, grouped by `kind`.
- Empty query shows recents; **recents are an MRU cap of five in localStorage, never
  frequency-ranked.** A palette that quietly reorders itself is worse than one that doesn't.
- ⌘K toggles, ↑↓ move, ↵ runs, Esc closes. **Tab is deliberately unbound** — the palette is one
  focus surface.
- The global keybinding ignores keystrokes inside text inputs, except ⌘K itself.

## Grouped lists

- `<section aria-labelledby>` per group, `<nav aria-label>` around any jump strip.
- Sticky group headers are constrained to the **scrolling parent**, not the viewport, or they
  collide with page chrome.
- Bucket with a `Map` to preserve insertion order; sort first, then group.
- Announce the item count per section.
- Worth the overhead only past ~30 items with a natural alphabetical or categorical anchor.

## Save bar

- `.p-save-bar`, with a `.dirty` modifier; `role="region" aria-label="Unsaved changes"`.
- Sticky to the bottom **inside the scrolling form**, `12px 16px` plus safe-area inset.
- Appears the instant the form goes dirty — that is what tells someone their edits are tracked.
- Use the summary slot to say what changed ("3 fields edited").
- Save stays **visible but disabled** while validation fails; it never disappears.
- Discard is ghost, Save is primary. Destructive discards confirm through an alert dialog.
