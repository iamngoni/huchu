# Rules — accessibility, copy, layering

These are contracts, not preferences. A change that violates one is a regression.

## Accessibility

### Focus
- Focus ring on **`:focus-visible` only** — 2px solid `--focus-ring` + 3px `--focus-ring-soft` halo.
  Never `outline: none` without an equivalent replacement.
- Modals trap focus while open; Escape releases. Focus **returns to the trigger** on close.
- The DS overlay stack handles nested overlays — Escape closes the innermost first. Don't hand-roll
  Escape handlers on DS overlays; you'll fight it.

### Keyboard
- Every interactive element operable by keyboard alone.
- Tab / Shift+Tab move · Enter / Space activate · Escape closes overlays.
- Composite widgets (tabs, menus, listboxes) use **roving tabindex**: one tab stop, arrows navigate inside.
  `Tabs`, `DataTable`, `Menu`, `KanbanBoard`, `NotificationMatrix` already implement this.
- Table rows activate on Enter. Checkboxes toggle on Space.
- `⌘K` opens the command palette from any surface.

### Labels & ARIA
- Every control needs `<label for>` or `aria-labelledby`. **Every icon-only button needs `aria-label`.**
- Screen-reader-only text uses `.sr-only`.
- Live regions: `aria-live="polite"` for toasts and confirmations, `aria-live="assertive"` for errors.
  `role="status"` for progress, `role="alert"` for errors.
- **Never signal state by colour alone.** Colour + icon + text label, always.

### Touch targets
36px default (`--h-control-md`), clearing the WCAG 24px floor. Mobile-primary surfaces use 44px
(`--h-control-lg`). Dense tables may use 30px, or 24px with 4px clear space.

### Contrast
Body text ≥ 4.5:1. Links and headings > 5:1. `--tone-warn` / `--tone-success` on white are 3.84:1 —
**AA Large / UI only** (badges, icons). For sentences on a tinted background use `--tone-success-strong`
or `--tone-danger-strong`.

### Motion
`prefers-reduced-motion: reduce` forces `animation-duration: 0.01ms !important` and snaps entrances to
their final frame. Do not override it. Never make motion load-bearing for meaning.

## Voice & copy

Tone: **confident, direct, quietly human.** No exclamation marks. No apologies. No marketing language.

| Surface | Rule | Good | Bad |
|---|---|---|---|
| Button | Action verb, sentence case | "Approve" · "Post" · "Settle" | "Click here to approve" |
| Confirmation | Past tense, name the object | "Receipt R-19281 printed" | "Yay! All done" |
| Error | What broke + next step | "Couldn't reach refinery. Retry?" | "Oops! Something went wrong" |
| Alert | Specific fact + timing | "Will sell out by 16:00" | "Low stock alert!" |
| Empty state | What, why, next action | "No receipts yet — they'll appear here as cashiers ring up sales" | "No data" |
| Loading | Name the action | "Fetching receipts…" | "Loading…" |
| Toast | One sentence, **no end punctuation** | "Receipt R-19281 printed" | "Success!" |
| Confirm dialog | Outcome + consequence | "Close shift. This locks the till until tomorrow" | "Are you sure?" |

- **Destructive actions must name the specific object affected.** Not "Delete item" — "Delete batch B-4471".
- **Warnings always carry a count or a next step.** Never a bare label.
- Sentence case everywhere. ALL CAPS never, eyebrows included.

### The five canonical status labels

**Needs input · Running · Completed · Idle · Not started**

Do not invent new ones. Do not synonym-drift ("In progress", "Pending", "Done", "Awaiting", "Queued" are
all wrong). If a state genuinely doesn't fit, that's a design conversation, not a copy choice.

### Value formatting

| Type | Format | Example |
|---|---|---|
| Money | symbol + non-breaking space + 2 decimals | `$ 2,816.40` |
| Time | 24-hour | `14:38` |
| Date | day month year, no zero-padding | `3 June 2026` |
| ID | mono, zero-padded | `R-19281` |
| Range | en-dash with spaces | `07:30 – 19:00` |

Anything numeric that can change gets `font-variant-numeric: tabular-nums`. IDs, timestamps, and monetary
amounts get `--font-mono`.

## Elevation & z-index

> "A border separates two surfaces at rest. A shadow only appears when something is floating."

Resting cards get `--border`, not a shadow. Shadowing several static cards destroys hierarchy.

| Layer | z-index | Contents |
|---|---|---|
| Base | auto / 0 | Page content, cards, tables |
| Local lift | 1–5 | Sticky headers, focus halos |
| In-page sticky | 20–30 | Embedded toolbars, chrome |
| Sidebar / rails | 44–55 | Navigation |
| Top nav | 60 | Primary nav bar |
| Drawer / sheet | 80–81 | Side drawers |
| Popover / menu | 90 | Dropdowns, date pickers |
| Modal | 100 | Modal dialogs |
| Toast | 200 | **Intentionally above modals** |

⚠ The package's own runtime overlay CSS uses **9998/9999** (and 1000 for `.lightbox-backdrop`), not this
scale. So DS overlays sit above everything in this repo regardless. When mixing a DS overlay with a
Radix/Base-UI overlay, the DS one wins — plan the interaction rather than fighting z-index.

## Colour discipline

1. Saturated colour = action or state. **Never decoration.**
2. **One brand-blue element per surface.** Two competing primary buttons is a bug.
3. Pick the role token; never bypass it to a raw `--gray-*`.
4. Never hard-code a hex.
5. `--text-muted` is for secondary prose, **never an action label** — it reads as disabled.
6. Red for irreversible. `--action-destructive-soft-bg` (warm grey) for serious-but-reversible.
7. Success copy is past tense and calm. No celebration.

## Pre-merge checklist

- [ ] Zero hard-coded hex / px / ms / font stacks
- [ ] One primary action on the surface
- [ ] Empty, loading, and error states all present
- [ ] `aria-label` on every icon-only button
- [ ] Keyboard-reachable and keyboard-operable end to end
- [ ] Focus visible, trapped in overlays, returned on close
- [ ] State conveyed by icon + text, not colour alone
- [ ] Status labels drawn from the canonical five
- [ ] Money / date / time / ID formatted per the table above
- [ ] `tabular-nums` on every changing number
- [ ] Resting surfaces bordered, not shadowed
- [ ] `prefers-reduced-motion` respected
- [ ] `"use client"` present on any file importing `@corelithzw/react`
- [ ] No action duplicated across header + toolbar + row
