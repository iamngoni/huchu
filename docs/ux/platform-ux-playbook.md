# Platform UX Playbook (Canonical)

## Scope and Precedence
This document is the canonical UX and UI source of truth for the platform.
When any UX guidance conflicts with other docs, this playbook wins.

## Warm Paper Foundation Tokens

### Colors
- `--surface-canvas`: `#FCFCF4` (warm paper canvas)
- `--surface-base`: `#FFFFFF` (primary panels)
- `--surface-muted`: `#F7F7F2` (subtle grouped areas)
- `--border`: `#E6E6E0` (light structural edges)
- `--text-strong`: `#111111`
- `--text-body`: `#111111`
- `--text-muted`: `#6B6B6B`
- `--text-subtle`: `#9A9A93`
- `--action-primary-bg`: `#4C64D4`
- `--action-secondary-bg`: `#EEF0FF`
- `--action-destructive-bg`: `#EC442C`

### Typography
- Family: `SS Huchu`, `Inter`, and system fallbacks.
- Page title: `32/700`
- Section title: `20/700`
- Body: `14/400`
- Label: `13/600`
- Table header: `12/600`, uppercase
- Table cell: `14/500`
- Caption: `12/500`
- Use strict 3-tier heading hierarchy: page title, section title, label/subsection.
- Numeric and time content must use `font-mono` and should be right-aligned unless context requires otherwise.

### Spacing
- Base grid: 8px rhythm (`4, 8, 12, 16, 20, 24, 32, 40, 48`).
- Content and section gutters: `24px`.
- Data table internal rhythm: `12px`.

### Radii
- Small: `6px`
- Default controls: `8px`
- Card or popover: `12px`
- Extra large: `16px`
- Pill: `9999px`

### Shadows
- Use minimal elevation.
- Primary data surfaces use border-first separation and no heavy shadow.
- Floating overlays only: `0 12px 24px -12px rgba(17,17,17,0.18), 0 2px 6px rgba(17,17,17,0.06)`.

## Core Layout Rules
- One table per active view is mandatory.
- Multi-table contexts must use a left vertical tab rail.
- Only the active vertical tab panel may render a table.
- Preserve search, filter, and pagination state per tab.
- Vertical rail labels must be visually subordinate to section titles.
- Do not add subtitles under vertical rail headings.

## Unified DataTable Controls Row
- Controls must be a single row.
- Left group: search input plus explicit submit action.
- Middle group: filters.
- Right group: rows-per-page and pagination controls.
- All controls in the row must share the same control height.
- Do not split filters into a separate card or a detached toolbar.

## Shell Patterns

### Where the title and the primary action go
- **The top app bar, always.** A shell that draws its own `PageHeader` in the
  page states the title twice — the bar is already showing it — and spends
  about 110px of an 844px screen doing it, while the bar sits empty beside the
  bell. Register both with `PageChrome`.
- A page's primary action belongs in the bar even when the page's table has a
  controls row of its own: parked there it lands under the title, the
  description and the search box, which on a phone is four hundred pixels down.
- A shell that offers module-wide verbs (Issue, Receive) offers them only on
  the views they are the verb for. On the others the bar carries the page's
  own action instead.

### List Shell
- Header row with title and primary action.
- Optional context tabs/segments directly above the DataTable.
- One primary full-bleed table surface.

### Detail Shell (Right Panel)
- Two-column layout.
- Main content on the left.
- Sticky right panel (`320-360px`) for requirement context, next actions, evidence, and integrations.

### Settings Shell
- Left settings navigation rail and single active settings panel.
- Prefer grouped sections with clear headings over long unstructured forms.
- Keep destructive actions isolated at the end of a section with explicit confirmation.

## Workflow Action Rules
- Render only valid next actions.
- Hide invalid actions; do not show disabled invalid actions.
- When useful, show requirement context near the action area:
  - pattern: "To continue, complete: [requirement 1], [requirement 2]".
- Use modal or sheet for confirmations, approvals, and edits requiring focused context.

## Status Vocabulary (Canonical)
Use these labels exactly across tables, filters, legends, exports, and chips:
- `Passing`
- `Failing`
- `Need changes`
- `In review`
- `In progress`
- `Pending`
- `Inactive`

`Ignored` is not a workflow status. It is only a chart rendering variant.

## Chart System Defaults
- Gridlines: dashed (`4px` dash, `6px` gap), low-contrast.
- Axis labels: muted and compact (`11-12px`).
- Keep stroke weights light and visual noise low.
- Apply canonical status color mapping:
  - Passing: `#2CA47C`
  - Failing: `#EC442C`
  - Need changes: `#F46414`
  - In review: `#4C64D4`
  - In progress: `#FCB414`
  - Pending: `#9A9A93`
  - Inactive: `#9A9A93`
- Render `Ignored` data with hatch pattern over inactive gray.

## List to Detail Context Preservation
- Opening detail from a list must preserve list context:
  - active tab
  - search text
  - filters
  - sort
  - pagination
  - scroll position where possible
- Returning from detail should restore the prior list state without forcing users to rebuild context.

## Bulk Action Bar Standards
- Bulk action bar appears only when one or more rows are selected.
- Placement: sticky bottom overlay that does not block primary table scan.
- Must include selected count, allowed bulk actions, and a clear selection action.
- Bulk actions must honor the same valid-action rule as row actions.

## Phone Rules
Written from a screenshot audit of every CRM screen at 390px. They generalise;
apply them to any module.

### The app bar
- The page's name is the one thing the bar says that nothing else on screen
  does. Nothing in the bar may crowd it out — search is an icon below `md`, and
  the route icon gives way when a back arrow is present.
- A record's name is too long for the bar at phone width. Repeat it on the page,
  above the identity strip, whenever the bar is in its phone row.

### Vertical budget
- The first screen belongs to the records, not to the chrome above them.
- Stat tiles are **two-up** on a phone (three only for a set of bare counts).
  A column of full-width tiles spends a screen per number.
- A dashboard widget narrower than half the grid is two-up on a phone.
- Never state the same fact twice in the same band — a progress fraction and a
  sentence saying the same thing, a section title in the shell and again in the
  panel inside it.

### Rails and strips
- Anything that scrolls sideways — stage chips, section tabs — runs to the edges
  of the screen and snaps. A strip cut short of the gutter reads as clipping;
  cut by the screen edge it reads as "there is more".
- A segment label never wraps. A strip that cannot fit scrolls rather than
  squashing its labels.

### Rows
- Two lines per row, and one fact on the right — the value, the balance, the
  figure the row is about. **Facts that need their label to make sense do not
  appear on a phone**: an unlabelled "0" after somebody's name says nothing.
- Sort before grouping. A letter heading over rows in `updatedAt` order is
  worse than no heading.
- Money carries its currency everywhere it appears, including inside an
  editable property.

### Controls
- A search box's placeholder is written for the width it renders at. Clipped
  hint text reads as a broken control; keep the long form as the accessible
  name.
- A column of controls in a sheet is a column of rows: labels at the left edge,
  a trailing caret at the right. Use `.stacked-controls`.
- A destructive action at the right edge of a row is under the thumb of anyone
  scrolling. It confirms first.
- The magnifier is an outline. Search is the quietest control in a toolbar.

### Overlays
- **One rung, `--z-overlay`, for every dismissable surface** — sheet, dialog,
  popover, menu, select. Open order decides what is on top, which is the only
  rule that survives nesting in both directions. Chrome sits below it
  (`--z-sidebar`, `--z-nav`), toasts above (`--z-toast`). Never write a bare
  `z-50` on an overlay.
- **A picker is a sheet on a phone, a popover on a desktop.** Use
  `ResponsivePopover`. A 358px panel anchored to a control near the bottom of a
  form has nowhere to go but over the form.
- **A bottom sheet is as tall as its content**, capped — never a fixed height.
  Rounded top, grabber, safe-area padding.
- **Dismissing a layer dismisses that layer only.** Escape in a picker must not
  close the form behind it. Mixing overlay libraries makes this a live risk:
  cover it with a test, not with hope.

### Record pages
Written from a screenshot audit of every CRM record at 390px. A record page
carries more per screen than anything else in the product, so it is where these
rules bite hardest.

- **Properties live at the top of the page, and they have to be readable
  there.** The label column is narrow on a phone (`w-28`), labels wrap rather
  than truncate — "Primary cont…" is a label somebody has to guess at — and a
  value that will not fit on one line wraps too. Nothing about a property may
  run off the right edge of the screen.
- **A property's editor is opened by pressing the value**, not by a verb parked
  beside it. Where the value is a link worth following, the affordance is an
  icon at the end of the row, not a word: "Change" spelled out costs about a
  quarter of the value column at phone width.
- **A rail section that repeats a property is deleted, not moved.** Once
  properties are at the top, an Overview tab that restates the address and the
  primary contact is a screen spent on what you just scrolled past.
- **A summary with nothing in it is not a tab.** Pass no rail rather than an
  empty one; the record then opens on its first real tab instead of on a blank
  screen with a name.
- **The record's actions are flat on a phone.** The app bar does its own
  collecting — first action shown, rest behind one `···`. Hand it a menu and
  the phone nests a menu inside a menu, with two controls on screen both
  called "More actions".
- Every record type has **one primary action**, and it is the thing that record
  exists for: convert a lead, schedule a visit on a site, start a deal on a
  company or a person. A record page whose bar holds only a back arrow and an
  overflow menu has not been designed, it has been rendered.
- A record that is no longer live **says so in its status chip**. An archived
  record that looks exactly like a working one is how somebody spends ten
  minutes on business nobody is pursuing.

### Navigation
- A section rail is a **scrolling strip** on a phone, never a stacked column.
  Thirteen items in a column is five hundred pixels of navigation above the
  page it navigates to.
- **No chrome that a phone will never use, not even for one frame.** Anything
  that picks a layout with `matchMedia` has no answer before hydration; give
  the phone the right answer in CSS so the first paint is not the desktop.

## Compliance Checklist
A screen is compliant only when:
1. Warm paper tokens are applied with semantic variables.
2. Exactly one table is visible per active view.
3. Multi-table contexts use vertical tabs.
4. DataTable controls are unified into a single aligned row.
5. Workflow invalid actions are hidden and requirement context is shown when useful.
6. Canonical statuses are used exactly, with `Ignored` chart-only.
7. Charts use dashed grid, muted labels, status mapping, and hatch for ignored.
8. List to detail navigation preserves context and bulk bar behavior follows this standard.
9. It has been looked at on a 390px screen against the phone rules above.
