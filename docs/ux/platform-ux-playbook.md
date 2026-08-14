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
