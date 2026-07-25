# Composition — blocks, patterns, shells, pages

Use this when building or restructuring a whole surface. For a single control see `03-components.md`.

## The six-step page recipe

1. **Pick a shell.** `AppShell` for almost everything; settings shell for multi-section editors;
   `AuthShell` for sign-in; `MobileShell` for portal/kiosk surfaces.
2. **One page header.** `PageHeader` — title, lede, meta pills, **max 3 actions, exactly 1 primary.**
3. **Pick one body block** by content type:
   | Content | Body block |
   |---|---|
   | List of records | List page shell |
   | One record | Detail page shell |
   | Create / edit form | Form shell |
   | Executive overview | KPI grid + module matrix |
   | Reference data editor | Master data shell |
4. **Wire the state surfaces** — empty, loading, error — **before shipping**, using `EmptyState`,
   status state, and record-saved banner.
5. **Place actions in exactly one place.** Page-level → header. Filters and bulk → toolbar.
   Per-record → row menu. **Never duplicate an action across two locations.**
6. **Wire keyboard + a11y.** Everything tab-reachable, `⌘K` palette available, `aria-label` on every
   icon-only button. See `05-rules.md`.

## Blocks (33)

A block is several components in a fixed arrangement with **no behavioural contract**. Prefix `b-`.
"React" means an export exists in `@corelithzw/react`; "CSS" means author markup yourself.

### Page chrome
| Block | Impl |
|---|---|
| Page header — title, lede, meta pills, actions | React `PageHeader` |
| Page intro — eyebrow + headline + lede | CSS (`.t-eyebrow` + `.t-page-title` + `.lede`) |
| List page shell — header + toolbar + table + pagination | CSS · compose `PageHeader` + `DataToolbar` + `DataTable` + `Pagination` |
| Detail page shell — hero + 1.4fr/1fr body | CSS `.detail-page` (`.detail-grid` `.detail-card` `.detail-stats`) |
| Form shell — header, sections, sticky action bar | CSS · compose `Form` + `Field` + `SaveBar` |

### Executive surfaces
| Block | Impl |
|---|---|
| Stat card — one number with delta | React `StatCard` / `Stat` |
| KPI grid | React `KpiGrid` — **deprecated**, use `StatCard` children in a grid |
| Module matrix — all active modules with status | CSS `.modules-grid` > `.module-card` (`.num` `.nm` `.ds` `.arrow`) |
| Summary bar — one line of small metrics | CSS |
| Critical strip — must-act-now items | CSS — ⚠ `.b-critical-strip` **has no styles**; see the gap note below |
| Quick links — 4-up next-action tiles | CSS (`.nav-card`) |
| Highlights — wins and anomalies | CSS |

### Content
| Block | Impl |
|---|---|
| Card & panel | React `Card` (+ `.card-soft` `.card-pad` `.card-sub`) |
| Detail hero — title + key facts + primary action | CSS `.detail-hero` |
| Activity feed — who / what / when | CSS `.activity-card` |
| Comment thread | React `CommentsThread` + `useComments` |
| Data toolbar — search, chips, count, bulk actions | React `DataToolbar` |
| Callout — bordered notice with icon | CSS `.b-callout` |

### Status & state — all four are required on every data surface
| Block | Impl |
|---|---|
| Empty state — first-run / no-results / error | React `EmptyState` (`variant="inline"` for < 80px) |
| Status state — whole-area loading / error / blocked | CSS · compose `Spinner` or `Skeleton` + `Alert` |
| Record saved banner | CSS |
| Export bar — recently-finished export | CSS |

### Mobile portal
| Block | Impl |
|---|---|
| Bottom tabs (3–5, phone only) | React `BottomTabs` · CSS `.b-bottom-tabs` |
| Filter chips (horizontal scroll) | React `FilterChips` · CSS `.b-filter-chips` |
| Row card (full-width tap target) | React `RowCard` · CSS `.b-row-card` |
| Stat hero (brand-tinted) | React `StatHero` · CSS `.b-stat-hero` |
| Day list (day-grouped events) | React `DayList` · CSS `.b-day-list` |

### Marketing & offline
| Block | Impl |
|---|---|
| Pricing grid / pricing card | CSS `.pricing-card` |
| Offline banner — system-wide disconnection | CSS |
| Sync panel — offline queue, retry, failures | CSS |
| Conflict dialog — side-by-side sync diff | CSS `.diff` / `.diff-line` inside `Modal` |

### ⚠ Documented blocks with no shipped CSS

Verified absent from `styles.css`: `.b-critical-strip` `.b-page-header` `.b-page-intro` `.b-module-matrix`
`.b-summary-bar` `.b-quick-links` `.b-highlights` `.b-status-state` `.b-record-saved-banner` `.b-export-bar`
`.b-offline-banner` `.b-sync-panel` `.b-conflict-dialog` `.b-form-shell` `.b-list-page-shell`
`.b-detail-page-shell` `.b-master-data-shell` `.b-stat-card` `.b-card` `.b-activity` `.b-comment`
`.b-data-toolbar` `.b-empty-state` `.b-pricing`.

Only **six** `.b-*` classes actually ship: `.b-bottom-tabs` `.b-callout` `.b-day-list` `.b-filter-chips`
`.b-row-card` `.b-stat-hero`.

For the rest, **compose from primitives and tokens** — using an unstyled `.b-*` class produces bare markup.
Where the website names one (e.g. `.b-critical-strip`), keep it on the element as a semantic hook, but do
not rely on it for appearance.

**Critical strip spec** (compose by hand): a top-of-page banner **above** the page header — icon +
one-line message + primary action. Tone follows the highest severity present. Max 4 items; at 5, link to a
queue instead. Only render it when there is something the operator must act on this shift.
Responsive: ≤720px the message wraps and the action becomes icon-only; ≥1024px full-width with the action
right-aligned.

## Patterns (20)

A pattern owns a **state machine, URL convention, or keyboard contract**. Prefix `x-`.
That contract — not complexity — is what makes something a pattern.

| Pattern | Contract it owns | Primary components |
|---|---|---|
| App shell | Sidebar collapse, tab order, responsive rail | `AppShell` + `NavGroup`/`NavItem` |
| Settings | 240px rail + 900px content, section routing | `.settings-layout` + `.settings-rail` |
| Executive dashboard | Drill-down navigation | Critical strip + `StatCard` + module matrix + highlights |
| Command palette | Global `⌘K`, fuzzy search, groups | `CommandPalette` |
| Data table | Sticky header, bulk select, pagination, filter URL state | `DataTable` + `DataToolbar` + `Pagination` + `useUrlState` |
| Detail view | Hero + body + context sidebar | `.detail-page` grid |
| Detail tabs | Tab ↔ URL sync | `Tabs` + `useUrlState` |
| Master data | Split pane, **saves on blur** | CSS |
| Bulk edit | Toolbar swap on selection, undo window | `DataToolbar` + `useOptimistic` |
| Import wizard | upload → map → preview → commit | `Stepper` + `FileUpload` + `DataTable` |
| Audit view | Cross-module append-only log | `.activity-card` |
| Modal & sheet | Overlay stack, focus trap, Escape order | `Modal` / `Drawer` |
| Bottom sheet | Phone-anchored, drag dismiss | `BottomSheet` |
| Approval flow | Approve / reject / delegate state machine | `AlertDialog` + `Stepper` |
| Role gate | Permission-based rendering | conditional render — see `x-role-gate` |
| Auth flow | sign-in → 2FA → reset | `AuthShell` + `InputOtp` |
| Onboarding | Workspace setup, feature primers, progress | `Checklist` + `Stepper` |
| Offline runtime | Queue, sync, conflict resolution | banner + sync panel + conflict dialog |
| Notifications | Toast → popover → inbox escalation | `ToastProvider` + `useToast` + `.notif` |
| Help center | In-product side panel | `Drawer` |

## Shells (9 app + 4 page)

| ID | Shell | Layout | Responsive |
|---|---|---|---|
| SHL·01 | Dashboard | 252px sidebar, org switcher, primary action, grouped nav | desktop → tablet rail → mobile sheet |
| SHL·02 | Settings | 240px rail + 900px max content | desktop → mobile collapse |
| SHL·03 | Data table | Full-bleed, sticky column headers | desktop, tablet |
| SHL·04 | POS portal | Bottom tabs, keypad, category tiles | mobile → tablet side rail → desktop + customer pane. PWA |
| SHL·05 | Parent portal | Mobile-first, fee balance | mobile → tablet. PWA |
| SHL·06 | Student portal | Tablet-first, collapsible left rail | tablet → phone sheet |
| SHL·07 | Teacher portal | Class/term-anchored nav | tablet → desktop → mobile |
| SHL·08 | Staff portal | Desktop-first self-service, softer than dashboard | desktop. PWA |
| SHL·09 | Admin control plane | Cross-tenant ops, **dark by default** | desktop only |
| PG·01 | List page | Header + toolbar + table + pagination | — |
| PG·02 | Detail page | **1.4fr / 1fr** body split | mobile stacks |
| PG·03 | Form | Grouped field sections + sticky save bar | — |
| PG·04 | Master data | Split list + editor, saves on blur | — |

⚠ SHL·09 is "dark by default" but the package ships **no dark mode**. Building it means authoring the
dark palette yourself. See `01-setup.md`.

Note the sidebar-width discrepancy: SHL·01 says 252px, `--sidebar-w` is **264px**, `--sidebar-w-narrow`
is 240px. Use the tokens.

## Page templates (10)

| Template | Purpose | Composition |
|---|---|---|
| `pg-overview` | Operations homepage | AppShell + KPI grid + critical strip + activity feed |
| `pg-data` | Dense ERP lists (batches, journals, invoices) | AppShell + data table + data toolbar |
| `pg-detail` | Record inspection | AppShell + detail view + detail tabs |
| `pg-posting` | Posting rules: configure, simulate, replay | AppShell + data table + modal |
| `pg-import` | CSV ingestion | AppShell + import wizard |
| `pg-inventory` | Stock, alerts, transfers | AppShell + master data |
| `pg-products` | Catalogue, grid + table views | AppShell + master data + filter chips |
| `pg-customers` | Directory with credit + purchase history | AppShell + master data + detail view |
| `pg-retail` | Retail module index | AppShell + module matrix |
| `pg-signin` | Auth, 3 layout variants | **No AppShell** + auth flow |

Full markup for each: `https://design.corelith.co.zw/system/<id>.html`.

## Responsive contract

Package breakpoints are `max-width`-first: **720px** is the main phone/desktop split; 900/1100/1200 handle
shell collapse; 320–600 tune dense mobile.

| Viewport | Gutter | Behaviour |
|---|---|---|
| ≤430px | 16px | Sidebar hidden behind hamburger → sheet. Controls 44px |
| 431–767px | 20px | Sidebar collapses to icon rail |
| 768–1199px | 24px | Full sidebar, narrowed content |
| ≥1200px | 24px | Full sidebar (240–280px), content to 1300px on data pages |

Do not mix these with Tailwind's `sm:`/`md:` scale inside one component — pick one system per component.
