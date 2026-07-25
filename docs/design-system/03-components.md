# Component catalogue

The website documents 47 primitives. The React package exports **71 components + 16 hooks**. The two sets
overlap but neither contains the other — some documented primitives are CSS-only, and some exports
(`Stack`, `Checklist`, `KanbanBoard`, `Lightbox`, `I18nProvider`, `Meter`, `NavItem`, …) are not on the
primitives page at all.

**Read props from the type file. Never from here, never from memory:**

```bash
grep -B3 -A25 "interface <Name>Props" node_modules/@corelithzw/react/dist/index.d.ts
```

The `.d.ts` carries JSDoc, `@example` blocks, and per-prop notes for nearly every component. It is the API.

## React exports

All 71. Compound children are listed inline. "Gotchas" flags only what the type signature won't tell you.

### Actions & input

| Component | Shape | Gotchas |
|---|---|---|
| `Button` | `variant` primary\|secondary\|ghost · `tone` default\|success\|warn\|danger · `size` sm\|md\|lg · `loading` `icon` `iconRight` `fullWidth` | One `primary` per surface |
| `Input` | `invalid` `leadingIcon` `trailingIcon` `trailingSlot` | `trailingSlot` takes non-icon content (e.g. `<Kbd>⌘K</Kbd>`). Covers the "input group" primitive |
| `TextArea` | `invalid` | |
| `Select` | `options?: SelectOption[]` or children · `placeholder` `invalid` | Styled **native** `<select>` |
| `Combobox` | `items` `value` `onChange(value, item)` `emptyMessage` `footer` `defaultQuery` | Filterable **body only** — you supply the anchor/`Popover` |
| `Checkbox` | `label` `indeterminate` | `indeterminate` is set as a DOM property via ref |
| `Radio` / `RadioGroup` | `Radio` needs `value`; group owns `name` `value` `onChange(value)` | Always nest Radio in RadioGroup |
| `Switch` | `label` | Applies immediately — no save step |
| `InputOtp` | `length` `value` `onChange(value)` `invalid`; ref → `{focus()}` | Ref is `InputOtpHandle`, not an element |
| `SegmentedControl<T>` | `options` `value`\|`defaultValue` `onChange(value, event?)` `size` sm\|md | Generic over `T extends string`. 2–4 segments |
| `FilterChips<T>` | `options` (with `count`) `value`\|`defaultValue` `onChange` `role` radiogroup\|tablist\|group | Single-select |
| `RoleSwitcher<T>` | `options` `value`\|`defaultValue` `onChange` | |
| `Form` | `submitOnEnter` (default true) | |
| `Field` + `.Label` `.Description` `.Error` | `label` `description` `error` `required` | Wires `id`/`aria-describedby` automatically. Read it via `useFieldContext()` |
| `InlineEdit` | `value` `onSave` `onCancel` `editing` | Click-to-edit; not a form control |
| `FileUpload` | `onFiles(File[])` `accept` `multiple` | Drop zone only — no progress. Pair with `useUpload()` |
| `Grabber` | `ariaLabel` | Drag affordance only; no DnD logic |
| `Calendar` | `value` `month` `onChange(date)` `min` `max` `disabledDates` `weekStartsOn` `locale` | Local-time `Date`. `disabledDates` compared Y-M-D |
| `DatePicker` | `value` `onChange` `min` `max` `format` `icon` `id` | Composes Input + Popover + Calendar. Single date only — for ranges use `useDateRange()` |

### Overlays

All portal to `document.body` unless given `container`, and share one **global overlay stack** — Escape
closes the innermost first, and focus returns to the trigger. Forwarded refs point at the `role="dialog"`
element.

| Component | Shape | Gotchas |
|---|---|---|
| `Modal` | `open` `onClose` `title` `subtitle` `footer` `size` sm\|md\|lg `dismissOnBackdrop` `dismissOnEscape` | Base for Dialog + AlertDialog |
| `Dialog` | `extends ModalProps` + `confirmLabel` `cancelLabel` `onConfirm` `confirmDisabled` `destructive` | Modal with a prebuilt footer |
| `AlertDialog` | `open` `onClose` `title` `description` `variant` default\|danger\|warning `onConfirm` `icon` | `onConfirm` may be async — the button shows loading until it resolves. Also `AlertDialog.confirm(opts) => Promise<boolean>` for imperative one-shots |
| `Drawer` | `side` right\|left `title` `subtitle` `footer` | Collapses to a bottom sheet under 720px |
| `BottomSheet` | `open` `onClose` `title` | Mobile-anchored |
| `Popover` | `open` `onClose` `title` `arrow` `dismissOnOutside` `dismissOnEscape` | You position the anchor |
| `CommandPalette` | `open` `onClose` `items: CommandItem[]` `placeholder` `emptyMessage` `footer` | Returns `ReactPortal \| null`. `CommandItem` has `group` `icon` `shortcut` `onSelect` |
| `Lightbox` | `images` `index` `open` `onClose` `onChange` | Drive with `useGallery()` |
| `Tooltip` | `content` `placement` top\|bottom\|left\|right `open` | `children` must be **one focusable element** |

### Layout & shells

| Component | Compound children | Notes |
|---|---|---|
| `AppShell` | `.Sidebar` (`collapsible` `onToggle`) · `.TopBar` / `.Topbar` · `.Main` · `.Brand` (`mark` `href`) | Root takes `collapsed`. Tab order: sidebar nav → top-bar → main |
| `AuthShell` | `.Brand` (`logo` `product`) · `.Card` (`title` `subtitle` `footer`) | Split-pane sign-in. No AppShell |
| `MobileShell` | `.Header` · `.Body` · `.BottomTabs` · `.Tab` · `.NavItem` | `.Tab` renders `null` — it is a config shape, not an element |
| `Stack` | — | `as` `direction` vertical\|horizontal `gap` none\|xs\|sm\|md\|lg\|xl `align` `justify` `wrap` |
| `Card` | `.Header` `.Title` `.Body` `.Footer` | Resting card: border, no shadow |
| `NavGroup` / `NavItem` | — | `NavItem` uses **`to`** (mapped to `href`), plus `active` `icon` `badge`. Emits `aria-current="page"` |
| `PageHeader` | — | `title` `onBack` `backLabel` `actions`. Exactly one per page |
| `Tabs` | `.List` (`ariaLabel`) `.Tab` (`value`) `.Panel` (`value`) | `value`+`onValueChange` or `defaultValue`. Full WAI-ARIA tablist |
| `BottomTabs<T>` | — | `items: BottomTabItem[]` (`icon` `badge` `href` `disabled`), `value` `onChange` |

### Data & display

| Component | Shape | Gotchas |
|---|---|---|
| `DataTable<Row>` | `columns` `rows` `getRowId` `selectable` `selected` `onSelectionChange` `sort` `onSortChange` `caption` `footer` `emptyState` | **Fully controlled** — sorting/selection state is yours; it does not sort rows. `DataTableSortState.column` is canonical; `columnId` is deprecated. Columns take `cell(row,i)` `numeric` `sortable` `width` |
| `DataToolbar` | `.Search` `.Filters` `.Actions` | Layout only — wire behaviour yourself |
| `Pagination` | `page` `pageCount` `onChange` `total` `pageSize` `pageSizeOptions` `onPageSizeChange` | |
| `Chart` | `.Line` `.Bar` `.Donut` (`inner`) `.Sparkline` | Minimal SVG. `width` `height` `color` `legend` `axes`. `Line` takes `ChartPoint[]`; `Bar`/`Donut` take `ChartCategoricalDatum[]`; `Sparkline` takes `number[]` or points |
| `KanbanBoard<T>` | `columns` `items` `onMove(id,from,to,toIndex)` `renderCard` `label` | Keyboard-accessible DnD. Pair with `useKanban()`. `KanbanColumnDef.limit` renders a WIP warn pill |
| `DayList` | `rows: {label, value, tone}` | `tone` is up\|down\|neutral |
| `RowCard` | `title` `sub` `value` `delta` `deltaTone` `meta` `leading` `trailing` `onClick` `href` | `deltaTone` positive\|negative\|neutral |
| `StatCard` (alias `Stat`) | `label` `value` `unit` `delta` `deltaTone` `tone` | `deltaTone` up\|down\|neutral. Note: differs from RowCard's |
| `StatHero` | `label` `value` `description` `secondaries[]` | |
| `KpiGrid` | `minWidth` | **Deprecated** on the website — use `StatCard` children in a plain grid |
| `Checklist` | `.Item` (`done` `title` `subtitle` `onToggle` `action`) | |
| `CommentsThread` | `comments` `currentUser` `mentionable` `onAdd` `onEdit` `onResolve` `onReact` `showResolved` `onToggleShowResolved` | Flat `Comment[]`, **one** nesting level — deeper replies flatten with a "replying to X" prefix. Pair with `useComments()`. `DEFAULT_REACTIONS` = 👍 ❤️ 😄 🎉 🤔 👀 |
| `NotificationMatrix` | `events` `channels` `value` (keyed `` `${eventId}:${channelId}` ``) `onChange` `masterPauseHours` `onMasterPause` | Real `<table>`. `MasterPause` = `0\|1\|4\|24\|'until-tomorrow'`. Pair with `usePreferences()` |

### Status & feedback

| Component | Shape | Gotchas |
|---|---|---|
| `Alert` | `tone` info\|success\|warn\|danger `title` `icon` | Inline, persistent |
| `Badge` | `tone` neutral\|info\|success\|warn\|danger\|clay\|outline `icon` | `clay` is a legacy alias of brand — don't use it |
| `Avatar` | `size` sm\|md\|lg `tone` default\|clay\|ink `name` `src` `alt` `initials` | Derives 1–2 initials from `name` |
| `Kbd` | — | |
| `EmptyState` | `icon` `title` `description` `action` `variant` full\|inline | `inline` renders `.p-empty-inline` — this **is** the "inline empty" primitive |
| `Progress` | `value` 0..1 (or 0..max with `max`) `label` | `null`/`undefined` → indeterminate |
| `Meter` | `value` `min` `max` `low` `high` `optimum` `tone` `label` | `role="meter"` — a gauge, not progress |
| `Spinner` | `label` | |
| `Skeleton` | `width` `height` `lines` `gap` | `lines > 1` stacks rows |
| `Stepper` | `.Step` (`state` pending\|current\|done, `label`) | Root takes `total` `current` (1-based) `labelled`. `total` ignored when children given |
| `SaveBar` | `dirty` `title` `summary` `onSave` `onDiscard` `saving` `saveLabel` `discardLabel` `actions` | Slides up on `dirty` |
| `Toast` / `ToastProvider` | Provider: `defaultDuration` (0 = sticky) `container`. Emit via `useToast()` | Mount the provider once. `ToastInput` has `tone` `title` `message` `duration` `action{label,onClick}` |
| `Menu` (alias `DropdownMenu`) | `.Item` (`icon` `shortcut` `destructive`) `.Label` `.Divider` / `.Separator` | Menu body only — you own the trigger and positioning |
| `I18nProvider` | `locale` `setLocale` `locales` `messages` `fallbackMessages` | Read via `useI18n()` / `useT()` |
| `LocalePicker` | `locales` `onChange(locale)` `label` | Reads `I18nProvider` unless overridden |

### Hooks

| Hook | Returns / purpose |
|---|---|
| `useToast()` | `{show(input) => id, dismiss(id)}` — needs `ToastProvider` |
| `useComments(initial?)` | `{comments, add, edit, resolve, react, reply}` — **in-memory**; back it with real persistence |
| `useKanban(initial)` | `{items, move, addCard, removeCard, setItems}` |
| `usePreferences(initial?)` | `{prefs, set, pauseFor, pause, quietHours, setQuietHours}` — **in-memory** |
| `useGallery(initial?, total?)` | `{open, index, show, close, next, prev, setIndex}` |
| `useDateRange(initial?)` | `{from, to, setRange, preset(id), isPreset(id)}` — ISO `YYYY-MM-DD`; auto-swaps if `from > to`. Presets: today, yesterday, this-week, last-week, this-month, last-month, last-7-days, last-30-days, year-to-date |
| `useUpload()` | `{upload(url, file\|FormData, opts?), cancel, reset, status, progress, error, response}` — XHR-backed, so real progress |
| `useOptimistic(initial, apply)` | `{base, setBase, derived, queue, mutate(m) => {confirm, rollback}}` |
| `useUrlState(key, default)` | `[value, set]` synced to `?key=` via `history.replaceState`. SSR-safe |
| `usePersistedFlag(key, initial)` | `[value, set]` in `localStorage`. Survives sign-out |
| `useMatchMedia(query)` (alias `useMediaQuery`) | `boolean`. Returns `false` during SSR **and on first client render** — deliberate, for hydration safety |
| `useInterval(cb, delay, {paused})` | Always calls the latest `cb`. `delay: null` or `paused` stops it |
| `useI18n()` / `useT()` | Full context / just `t(key, vars)` |
| `useFieldContext()` | `{inputId, descId, errorId, invalid, describedBy} \| null` — for custom controls inside `Field` |

## CSS-only — no React export

Documented on the primitives page but **absent from `@corelithzw/react@0.3.0`**. Author markup by hand
against the classes below, which are all verified present in `styles.css`. Grep before extending:

```bash
grep -n "^[^{]*\.<class>[^a-z0-9_-]" node_modules/@corelithzw/react/dist/styles.css
```

| Primitive | Real markup contract |
|---|---|
| **Accordion** | `.accordion` wrapping native `<details>` / `<summary>`, body in `.acc-body`. Open state is `<details open>` — the browser handles `aria-expanded` and keyboard. ⚠ The website documents `.accordion-item` / `.accordion-trigger` / `.accordion-content`; **those do not exist.** |
| **Status indicator** | `.status-dot` + one of `.attention` `.ok` `.progress` `.idle` `.ring`. Dot drawn via `::before` |
| **Chip** | `.chip`, with `.icon`/`svg` and `.caret` children; rows use `.chip-bar`. Filter variant `.fchip` |
| **Tag** | `.tag` with a `.x` child as the remove button (needs a real `<button>` + `aria-label`) |
| **Table** | `.table`; `<th>`/`<td class="num">` right-aligns numerics; `.table.quiet` for low-chrome; `.more` for the row overflow trigger. Use `DataTable` instead whenever the table sorts or selects |
| **Numeric cell** | `.num` on `th`/`td`, plus `--type-mono` and `tabular-nums` |
| **Item row** | `.list-item` with `.lead` `.title` (`.bold`) `.sub` `.meta` `.chev` `.body-text > .desc` |
| **Mobile list** | `.list`, or `.list-plain` for no chrome, containing `.list-item` |
| **Button group** | `.btn-split` — split buttons and toggle groups. ⚠ There is no `.btn-group` |
| **Hover card** | `.hover-card`, which forwards to `.pop-card`. Legacy — prefer `Popover` |
| **Attachment center** | `.upload-zone` (`.uz-ic` `.uz-title` `.uz-help` `.uz-actions`, `.dragover` state) plus `.file-row` / `.file-tile`. React `FileUpload` covers only the drop zone |
| **Pill** | `.pill`, or `.erp-pill` for the denser ERP variant. Prefer `Badge` |
| **Avatar group** | `.avatar-group` around stacked `Avatar`s |
| **Tab strips** | `.tabstrip` `.seg-tabs` `.iconstrip` / `.iconstrip-tab` `.kit-tab`. Prefer `Tabs` — these have no keyboard contract |
| **Toolbars** | `.page-toolbar` `.toolbar-group` |
| **Sidebar internals** | `.sb-chrome` `.sb-nav` `.sb-section` `.sb-section-label` `.sb-item`. Prefer `AppShell.Sidebar` + `NavGroup`/`NavItem` |
| **Settings layout** | `.settings-layout` `.settings-rail` `.settings-content` `.settings-section` `.settings-row` |
| **Steps** | `.steps` with `.st` (`.current` `.done`), `.st-bubble` `.st-label` `.st-rail`. Prefer `Stepper` |
| **Notification row** | `.notif` (`.unread`) with `.n-av` (`.brand` `.success` `.warn` `.danger`) `.n-body` `.n-dot` `.n-time` |
| **Diff** | `.diff` / `.diff-line` — for the sync conflict view |

**No styles ship at all** for these documented primitives: mobile action bar, scroll container, page section,
export menu. This repo already has working local implementations
(`components/ui/mobile-action-bar.tsx`, `scroll-container.tsx`, `page-section.tsx`, `export-menu.tsx`) —
**keep them** and restyle with tokens. Do not delete them expecting a DS replacement.

## Utilities in `styles.css`

Layout: `.row` `.col` `.wrap` `.nowrap` `.grow` `.center` `.between` `.gap-1` `.gap-4` `.ml-auto` `.truncate`
Type: `.t-*` (see `02-tokens.md`) · A11y: `.sr-only` `.ds-skip-link` · Motion: `.anim-*`
