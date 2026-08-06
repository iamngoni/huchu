/* Huchu DS — Unified navigation (main nav + kit nav + drawer sidebar)
 *
 * This is the single source of truth for site navigation. It replaces:
 *   - hx-nav.js (old mobile drawer)
 *   - the sidebar/topbar injection inside system-shell.js
 *   - portal-kit-nav.js (folded into the kit-nav rendering here)
 *   - hand-rolled .ds-slim-nav / .hx-topbar markup in hub pages
 *
 * MARKUP CONTRACT
 *   <body data-kit-nav="pos">              -> renders a kit nav below the main nav
 *   <body class="hx-no-nav">               -> opt out entirely (fullscreen demos)
 *   <body class="is-fullscreen">           -> same as hx-no-nav (legacy alias)
 *
 * EXPORTS
 *   window.HuchuNav = { open, close, toggle, pin, unpin, togglePin }
 *
 * SIDEBAR STATE (localStorage keys, all prefixed `huchu-side:`)
 *   huchu-side:pinned   JSON array of pinned link keys/hrefs
 *   huchu-side:recents  JSON array of {label, href, key} (most-recent first, max 8)
 *   huchu-side:open     JSON map of {groupLabel: boolean} — last-known open state
 */
(function () {
  // -------- Path / link helpers -------------------------------------------
  function rootFromPath() {
    const segs = location.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const depth = Math.max(0, segs.length - 1);
    return '../'.repeat(depth);
  }
  const ROOT = rootFromPath();
  const PATH = location.pathname;
  const CURRENT_FILE = (PATH.split('/').pop() || '').replace('.html', '');

  // -------- Single-source-of-truth link config ----------------------------
  // Top-level main nav. Four super-sections — cookbook-first IA so people
  // building a feature land in recipes (the "how to build X" book), and
  // only drop into Reference when they need depth on a single piece.
  //   Get started · Cookbook · Reference · Apps
  const SECTIONS = [
    { label: 'Get started', href: ROOT + 'system/get-started.html',
      match: /\/(get-started|install|changelog|principles)\.html$/ },
    { label: 'Cookbook',    href: ROOT + 'cookbook/index.html',
      match: /\/cookbook\// },
    { label: 'Reference',   href: ROOT + 'system/foundations.html',
      match: /\/(foundations|colors|typography|spacing|elevation|motion|iconography|accessibility|content|voice|tokens|primitives|p-[a-z-]+|blocks|b-[a-z-]+|patterns|x-[a-z-]+|shells|pages|guides|guide-[a-z-]+)\.html$/ },
    { label: 'Apps',        href: ROOT + 'portals/index.html',
      match: /\/(portals|kits|verticals)\// },
  ];

  // Sidebar (full IA, single source of truth). Cookbook-first IA:
  //   Get started   – overview, install, principles, changelog
  //   Cookbook      – recipes by theme (auth, shells, forms, lists, …)
  //   Reference     – every design-system page, kept reachable but folded
  //                   into one super-group so the drawer scans cleanly
  //   Apps          – the 9 live portal demos (apps you can sign into)
  //   Catalogs      – kits + verticals (UI catalogues, not apps)
  //   Resources     – sitemap + repo
  //
  // Phase 1: only `auth-signin-2fa` is real. Everything else in the cookbook
  // group is a placeholder with href '#' and the side-tag "Soon" so future
  // agents can swap the href + drop the tag once the recipe ships.
  const SIDEBAR = [
    { label: 'Get started', items: [
      ['Overview',          ROOT + 'index.html',                'index'],
      ['Introduction & install', ROOT + 'system/get-started.html', 'get-started', 'New'],
      ['Install',           ROOT + 'system/install.html',       'install'],
      ['Principles',        ROOT + 'system/principles.html',    'principles'],
      ['Changelog',         ROOT + 'system/changelog.html',     'changelog', 'v0.5'],
    ]},
    { label: 'Cookbook', items: [
      ['Playground',        ROOT + 'playground/index.html',     'playground', 'New'],
      // ── Onboarding ──────────────────────────────────────────
      ['Onboarding ·  First-run checklist', ROOT + 'cookbook/onboarding-checklist.html',      'onboarding-checklist',      'New'],
      // ── Auth ────────────────────────────────────────────────
      ['Auth ·  Sign in with 2FA',          ROOT + 'cookbook/auth-signin-2fa.html', 'auth-signin-2fa', 'New'],
      ['Auth ·  Forgot password',           ROOT + 'cookbook/auth-forgot-password.html',      'auth-forgot-password',      'New'],
      ['Auth ·  Sign up + email verify',    ROOT + 'cookbook/auth-signup-email-verify.html',  'auth-signup-email-verify',  'New'],
      ['Auth ·  Permission gate',           ROOT + 'cookbook/auth-permission-gate.html',      'auth-permission-gate',      'New'],
      // ── Shells & nav ────────────────────────────────────────
      ['Shells ·  App shell with sidebar',  ROOT + 'cookbook/shells-app-shell-sidebar.html',  'shells-app-shell-sidebar',  'New'],
      ['Shells ·  Mobile bottom-tab shell', ROOT + 'cookbook/shells-mobile-bottom-tab.html',  'shells-mobile-bottom-tab',  'New'],
      ['Shells ·  Command palette (⌘K)',    ROOT + 'cookbook/commands-cmd-k.html',            'commands-cmd-k',            'New'],
      ['Shells ·  Multi-tenant switcher',   ROOT + 'cookbook/shells-multi-tenant-switcher.html', 'shells-multi-tenant-switcher', 'New'],
      ['Shells ·  Deep-link state restore', ROOT + 'cookbook/shells-deep-link-restore.html',  'shells-deep-link-restore',  'New'],
      // ── Forms ───────────────────────────────────────────────
      ['Forms ·  Multi-step wizard',        ROOT + 'cookbook/forms-multi-step-wizard.html',     'forms-multi-step-wizard',     'New'],
      ['Forms ·  Autosave drawer form',     ROOT + 'cookbook/forms-autosave-drawer.html',       'forms-autosave-drawer',       'New'],
      ['Forms ·  Inline edit on row',       ROOT + 'cookbook/forms-inline-edit-row.html',       'forms-inline-edit-row',       'New'],
      ['Forms ·  Bulk edit with undo',      ROOT + 'cookbook/forms-bulk-edit-with-undo.html',   'forms-bulk-edit-with-undo',   'New'],
      ['Forms ·  File upload',              ROOT + 'cookbook/forms-file-upload.html',           'forms-file-upload',           'New'],
      ['Forms ·  Date-range picker',        ROOT + 'cookbook/forms-date-range-picker.html',     'forms-date-range-picker',     'New'],
      // ── Lists & detail ──────────────────────────────────────
      ['Lists ·  Simple list',              ROOT + 'cookbook/lists-simple-list.html',           'lists-simple-list',           'New'],
      ['Lists ·  Grid list',                ROOT + 'cookbook/lists-grid-list.html',             'lists-grid-list',             'New'],
      ['Lists ·  Grouped by date',          ROOT + 'cookbook/lists-grouped-by-date.html',       'lists-grouped-by-date',       'New'],
      ['Lists ·  Grouped by section',       ROOT + 'cookbook/lists-grouped-by-section.html',    'lists-grouped-by-section',    'New'],
      ['Lists ·  Virtualised long list',    ROOT + 'cookbook/lists-virtualised-long.html',      'lists-virtualised-long',      'New'],
      ['Lists ·  History feed',             ROOT + 'cookbook/lists-history-feed.html',          'lists-history-feed',          'New'],
      ['Lists ·  Filterable data table',    ROOT + 'cookbook/lists-filterable-data-table.html', 'lists-filterable-data-table', 'New'],
      ['Lists ·  Master–detail page',       ROOT + 'cookbook/lists-master-detail.html',         'lists-master-detail',         'New'],
      ['Lists ·  Activity log',             ROOT + 'cookbook/lists-activity-log.html',          'lists-activity-log',          'New'],
      ['Lists ·  Kanban board',             ROOT + 'cookbook/lists-kanban-board.html',          'lists-kanban-board',          'New'],
      // ── Tables ──────────────────────────────────────────────
      ['Tables ·  Server-paginated',        ROOT + 'cookbook/tables-server-paginated.html',     'tables-server-paginated',     'New'],
      ['Tables ·  Editable cells',          ROOT + 'cookbook/tables-editable-cells.html',       'tables-editable-cells',       'New'],
      ['Tables ·  Heavy with everything',   ROOT + 'cookbook/tables-heavy-with-everything.html','tables-heavy-with-everything','New'],
      ['Tables ·  Responsive to cards',     ROOT + 'cookbook/tables-responsive-to-cards.html',  'tables-responsive-to-cards',  'New'],
      // ── Views ───────────────────────────────────────────────
      ['Views ·  Print-friendly views',     ROOT + 'cookbook/views-print-friendly.html',        'views-print-friendly',        'New'],
      ['Views ·  Image gallery + lightbox', ROOT + 'cookbook/views-image-gallery.html',         'views-image-gallery',         'New'],
      // ── Communication ───────────────────────────────────────
      ['Communication ·  Comments thread',  ROOT + 'cookbook/communication-comments-thread.html', 'communication-comments-thread', 'New'],
      // ── Dashboards ──────────────────────────────────────────
      ['Dashboards ·  Operator overview',   ROOT + 'cookbook/dashboards-operator-overview.html', 'dashboards-operator-overview', 'New'],
      ['Dashboards ·  KPI hero + drilldown',ROOT + 'cookbook/dashboards-kpi-hero-drilldown.html', 'dashboards-kpi-hero-drilldown', 'New'],
      // ── States ──────────────────────────────────────────────
      ['States ·  Empty, loading, error',   ROOT + 'cookbook/states-empty-loading-error.html', 'states-empty-loading-error', 'New'],
      ['States ·  Toasts + notifications',  ROOT + 'cookbook/notifications-toasts.html',       'notifications-toasts',       'New'],
      ['States ·  Optimistic mutations',    ROOT + 'cookbook/states-optimistic-mutations.html', 'states-optimistic-mutations', 'New'],
      // ── Settings ────────────────────────────────────────────
      ['Settings ·  Notification preferences', ROOT + 'cookbook/settings-notification-preferences.html', 'settings-notification-preferences', 'New'],
      ['Settings ·  Profile & security',    '#',                '__', 'Soon'],
      ['Settings ·  Team & roles',          '#',                '__', 'Soon'],
      // ── International ───────────────────────────────────────
      ['International ·  Localised app',    ROOT + 'cookbook/i18n-localized-app.html', 'i18n-localized-app', 'New'],
      ['International ·  RTL layout audit', '#',                '__', 'Soon'],
      // ── Approvals & queues ──────────────────────────────────
      ['Approvals ·  Leave-request workflow',ROOT + 'cookbook/approvals-leave-request.html', 'approvals-leave-request', 'New'],
      ['Approvals ·  Inbox + bulk actions', '#',                '__', 'Soon'],
      // ── Charts ──────────────────────────────────────────────
      ['Charts ·  Single-series line',      ROOT + 'cookbook/charts/line-simple.html',    'charts-line-simple',    'New'],
      ['Charts ·  Multi-series line',       ROOT + 'cookbook/charts/line-multi.html',     'charts-line-multi',     'New'],
      ['Charts ·  Stacked area',            ROOT + 'cookbook/charts/area-stacked.html',   'charts-area-stacked',   'New'],
      ['Charts ·  Vertical bars',           ROOT + 'cookbook/charts/bar-vertical.html',   'charts-bar-vertical',   'New'],
      ['Charts ·  Horizontal bars',         ROOT + 'cookbook/charts/bar-horizontal.html', 'charts-bar-horizontal', 'New'],
      ['Charts ·  Grouped bars',            ROOT + 'cookbook/charts/bar-grouped.html',    'charts-bar-grouped',    'New'],
      ['Charts ·  Stacked bars',            ROOT + 'cookbook/charts/bar-stacked.html',    'charts-bar-stacked',    'New'],
      ['Charts ·  Donut',                   ROOT + 'cookbook/charts/donut.html',          'charts-donut',          'New'],
      ['Charts ·  Pie',                     ROOT + 'cookbook/charts/pie.html',            'charts-pie',            'New'],
      ['Charts ·  Progress ring',           ROOT + 'cookbook/charts/progress-ring.html',  'charts-progress-ring',  'New'],
      ['Charts ·  Sparkline (KPI inline)',  ROOT + 'cookbook/charts/sparkline.html',      'charts-sparkline',      'New'],
      ['Charts ·  Bullet',                  ROOT + 'cookbook/charts/bullet.html',         'charts-bullet',         'New'],
      ['Charts ·  Calendar heatmap',        ROOT + 'cookbook/charts/heatmap.html',        'charts-heatmap',        'New'],
      ['Charts ·  Conversion funnel',       ROOT + 'cookbook/charts/funnel.html',         'charts-funnel',         'New'],
      ['Charts ·  Scatter',                 ROOT + 'cookbook/charts/scatter.html',        'charts-scatter',        'New'],
      ['Charts ·  Radar / spider',          ROOT + 'cookbook/charts/radar.html',          'charts-radar',          'New'],
      ['Charts ·  Treemap',                 ROOT + 'cookbook/charts/treemap.html',        'charts-treemap',        'New'],
      ['Charts ·  Gauge',                   ROOT + 'cookbook/charts/gauge.html',          'charts-gauge',          'New'],
      ['Charts ·  Waterfall',               ROOT + 'cookbook/charts/waterfall.html',      'charts-waterfall',      'New'],
      ['Charts ·  Candlestick (OHLC)',      ROOT + 'cookbook/charts/candlestick.html',    'charts-candlestick',    'New'],
    ]},
    // Reference was previously one monolithic super-group with "X ·  "-prefixed
    // labels. We split it into sibling collapsible groups (each its own
    // <details>) so the sidebar reads like a real ToC. Every original href
    // is preserved; the only change is shape.
    { label: 'Foundations', items: [
      ['Foundations',       ROOT + 'system/foundations.html',   'foundations'],
      ['Colors',            ROOT + 'system/colors.html',        'colors'],
      ['Typography',        ROOT + 'system/typography.html',    'typography'],
      ['Spacing & layout',  ROOT + 'system/spacing.html',       'spacing'],
      ['Elevation',         ROOT + 'system/elevation.html',     'elevation'],
      ['Motion',            ROOT + 'system/motion.html',        'motion'],
      ['Iconography',       ROOT + 'system/iconography.html',   'iconography'],
      ['Accessibility',     ROOT + 'system/accessibility.html', 'accessibility', 'New'],
      ['Token reference',   ROOT + 'system/tokens.html',        'tokens'],
      ['Tokens (JSON)',     ROOT + 'tokens/README.md',          '__',            'New'],
      ['Internationalisation (i18n)', ROOT + 'i18n/index.html',  '__',            'New'],
      ['Voice & tone',      ROOT + 'system/voice.html',         'voice'],
      ['Writing guidelines',ROOT + 'system/content.html',       'content'],
    ]},
    // Components (formerly "Primitives"). Renamed because the word "components"
    // is what people search for. Page slugs stay p-* — only the group label changes.
    { label: 'Components', items: [
      ['Button',             ROOT + 'system/p-button.html',           'p-button'],
      ['Button group',       ROOT + 'system/p-button-group.html',     'p-button-group'],
      ['Segmented control',  ROOT + 'system/p-segmented-control.html','p-segmented-control'],
      ['Input',              ROOT + 'system/p-input.html',            'p-input'],
      ['Input group',        ROOT + 'system/p-input-group.html',      'p-input-group'],
      ['Input OTP',          ROOT + 'system/p-input-otp.html',        'p-input-otp'],
      ['Select & combobox',  ROOT + 'system/p-select.html',           'p-select'],
      ['Combobox',           ROOT + 'system/p-combobox.html',         'p-combobox'],
      ['Date picker',        ROOT + 'system/p-date-picker.html',      'p-date-picker'],
      ['Calendar',           ROOT + 'system/p-calendar.html',         'p-calendar'],
      ['Checkbox & radio',   ROOT + 'system/p-checkbox.html',         'p-checkbox'],
      ['Switch & toggle',    ROOT + 'system/p-switch.html',           'p-switch'],
      ['Accordion',          ROOT + 'system/p-accordion.html',        'p-accordion'],
      ['Badge & pill',       ROOT + 'system/p-badge.html',            'p-badge'],
      ['Status indicator',   ROOT + 'system/p-status.html',           'p-status'],
      ['Avatar',             ROOT + 'system/p-avatar.html',           'p-avatar'],
      ['Chip & tag',         ROOT + 'system/p-chip.html',             'p-chip'],
      ['Tooltip',            ROOT + 'system/p-tooltip.html',          'p-tooltip'],
      ['Kbd',                ROOT + 'system/p-kbd.html',              'p-kbd'],
      ['Alert',              ROOT + 'system/p-alert.html',            'p-alert'],
      ['Alert dialog',       ROOT + 'system/p-alert-dialog.html',     'p-alert-dialog'],
      ['Dropdown menu',      ROOT + 'system/p-dropdown-menu.html',    'p-dropdown-menu'],
      ['Popover',            ROOT + 'system/p-popover.html',          'p-popover'],
      ['Hover card',         ROOT + 'system/p-hover-card.html',       'p-hover-card'],
      ['Command palette',    ROOT + 'system/p-command.html',          'p-command'],
      ['Progress & meter',   ROOT + 'system/p-progress.html',         'p-progress'],
      ['Spinner & skeleton', ROOT + 'system/p-spinner.html',          'p-spinner'],
      ['Mobile list',        ROOT + 'system/p-mobile-list.html',      'p-mobile-list'],
      ['Mobile action bar',  ROOT + 'system/p-mobile-action-bar.html','p-mobile-action-bar'],
      ['Item row',           ROOT + 'system/p-item.html',             'p-item'],
      ['Table',              ROOT + 'system/p-table.html',            'p-table',      'New'],
      ['Tabs',               ROOT + 'system/p-tabs.html',             'p-tabs',       'New'],
      ['Tag',                ROOT + 'system/p-tag.html',              'p-tag',        'New'],
      ['Toast',              ROOT + 'system/p-toast.html',            'p-toast',      'New'],
      ['Skeleton',           ROOT + 'system/p-skeleton.html',         'p-skeleton',   'New'],
      ['Pagination',         ROOT + 'system/p-pagination.html',       'p-pagination', 'New'],
      ['Chart',              ROOT + 'system/p-chart.html',            'p-chart',      'New'],
      ['Save bar',           ROOT + 'system/p-save-bar.html',         'p-save-bar',   'New'],
      ['Inline empty',       ROOT + 'system/p-empty.html',            'p-empty',      'New'],
      ['Grabber',            ROOT + 'system/p-grabber.html',          'p-grabber',    'New'],
      ['Stepper',            ROOT + 'system/p-stepper.html',          'p-stepper',    'New'],
      ['Role switcher',      ROOT + 'system/p-role-switcher.html',    'p-role-switcher', 'New'],
    ]},
    { label: 'Blocks', items: [
      ['Page header',        ROOT + 'system/b-page-header.html',  'b-page-header'],
      ['Stat card',          ROOT + 'system/b-stat-card.html',    'b-stat-card'],
      ['Stat hero',          ROOT + 'system/b-stat-hero.html',    'b-stat-hero',   'New'],
      ['KPI grid',           ROOT + 'system/b-kpi-grid.html',     'b-kpi-grid',    'Deprecated'],
      ['Module matrix',      ROOT + 'system/b-module-matrix.html','b-module-matrix'],
      ['Card & panel',       ROOT + 'system/b-card.html',         'b-card'],
      ['Data toolbar',       ROOT + 'system/b-data-toolbar.html', 'b-data-toolbar'],
      ['Filter chips',       ROOT + 'system/b-filter-chips.html', 'b-filter-chips','New'],
      ['Bottom tabs',        ROOT + 'system/b-bottom-tabs.html',  'b-bottom-tabs', 'New'],
      ['Row card',           ROOT + 'system/b-row-card.html',     'b-row-card',    'New'],
      ['Day list',           ROOT + 'system/b-day-list.html',     'b-day-list',    'New'],
      ['Empty state',        ROOT + 'system/b-empty-state.html',  'b-empty-state'],
      ['Callout',            ROOT + 'system/b-callout.html',      'b-callout'],
    ]},
    { label: 'Patterns', items: [
      ['App shell',           ROOT + 'system/x-app-shell.html',           'x-app-shell'],
      ['Data table',          ROOT + 'system/x-data-table.html',          'x-data-table'],
      ['Detail view',         ROOT + 'system/x-detail-view.html',         'x-detail-view'],
      ['Detail tabs',         ROOT + 'system/x-detail-tabs.html',         'x-detail-tabs',         'New'],
      ['Master data',         ROOT + 'system/x-master-data.html',         'x-master-data',         'New'],
      ['Bulk edit',           ROOT + 'system/x-bulk-edit.html',           'x-bulk-edit',           'New'],
      ['Import wizard',       ROOT + 'system/x-import-wizard.html',       'x-import-wizard',       'New'],
      ['Audit view',          ROOT + 'system/x-audit-view.html',          'x-audit-view',          'New'],
      ['Approval flow',       ROOT + 'system/x-approval-flow.html',       'x-approval-flow',       'New'],
      ['Role gate',           ROOT + 'system/x-role-gate.html',           'x-role-gate',           'New'],
      ['Executive dashboard', ROOT + 'system/x-executive-dashboard.html', 'x-executive-dashboard', 'New'],
      ['Settings',            ROOT + 'system/x-settings.html',            'x-settings',            'New'],
      ['Onboarding',          ROOT + 'system/x-onboarding.html',          'x-onboarding',          'New'],
      ['Notifications',       ROOT + 'system/x-notifications.html',       'x-notifications',       'New'],
      ['Help center',         ROOT + 'system/x-help-center.html',         'x-help-center',         'New'],
      ['Offline runtime',     ROOT + 'system/x-offline-runtime.html',     'x-offline-runtime',     'New'],
      ['Modal & sheet',       ROOT + 'system/x-modal.html',               'x-modal'],
      ['Bottom sheet',        ROOT + 'system/x-bottom-sheet.html',        'x-bottom-sheet',        'New'],
      ['Auth flow',           ROOT + 'system/x-auth.html',                'x-auth'],
      ['Command palette',     ROOT + 'system/x-command-palette.html',     'x-command-palette'],
    ]},
    { label: 'Shells', items: [
      ['Shells reference',   ROOT + 'system/shells.html',        'shells'],
    ]},
    { label: 'Page templates', items: [
      ['Pages reference',    ROOT + 'system/pages.html',         'pages'],
    ]},
    { label: 'Guides', items: [
      ['All guides',         ROOT + 'system/guides.html',                  'guides', 'New'],
      ['Compose a page',     ROOT + 'system/guide-compose-page.html',      'guide-compose-page'],
      ['Compose a pattern',  ROOT + 'system/guide-compose-pattern.html',   'guide-compose-pattern'],
      ['New feature module', ROOT + 'system/guide-new-feature.html',       'guide-new-feature'],
      ['Block vs. pattern',  ROOT + 'system/guide-block-vs-pattern.html',  'guide-block-vs-pattern'],
      ['Mobile adaptation',  ROOT + 'system/guide-mobile-adaptation.html', 'guide-mobile-adaptation'],
    ]},
    // Apps = live, sign-in-able portal demos. One CTA per row: open the app.
    // The portal index page is the "hub" — accessed via the All apps link.
    { label: 'Apps', icon: 'grid', items: [
      ['All apps',          ROOT + 'portals/index.html',        '__portals'],
      ['POS terminal',      ROOT + 'portals/pos/demo.html',     '__', null, 'receipt'],
      ['Parent portal',     ROOT + 'portals/parent/demo.html',  '__', null, 'user'],
      ['Student portal',    ROOT + 'portals/student/demo.html', '__', null, 'book'],
      ['Teacher portal',    ROOT + 'portals/teacher/demo.html', '__', null, 'edit'],
      ['Staff portal',      ROOT + 'portals/staff/demo.html',   '__', null, 'user'],
      ['Admin portal',      ROOT + 'portals/admin/demo.html',   '__', 'Dark', 'shield'],
      ['Owner / Manager',   ROOT + 'portals/owner/demo.html',   '__', 'Dark', 'chart'],
      ['Gold Mine Clerk',   ROOT + 'portals/gold/demo.html',    '__', null, 'gem'],
      ['Scrap Yard Clerk',  ROOT + 'portals/scrap/demo.html',   '__', 'New', 'recycle'],
      ['Stash · personal finance', ROOT + 'portals/stash/demo.html',  '__', 'New', 'coins'],
    ]},
    // Catalogs = product UI kits + vertical catalogues. NOT apps — they are
    // libraries of pre-composed pages you can drop into your own product.
    { label: 'Catalogs', icon: 'folder', items: [
      ['All catalogs',      ROOT + 'kits/overview.html',        '__catalogs'],
      ['Verticals',         ROOT + 'verticals/index.html',      '__verticals'],
      ['Dashboard kit',     ROOT + 'kits/overview.html',        '__'],
      ['Gold mining',       ROOT + 'verticals/gold/index.html', '__'],
      ['Scrap metal',       ROOT + 'verticals/scrap/index.html','__'],
      ['Retail',            ROOT + 'verticals/retail/index.html','__'],
      ['Schools',           ROOT + 'verticals/schools/index.html','__'],
      ['Auto',              ROOT + 'verticals/auto/index.html', '__'],
      ['Warehouses',        ROOT + 'verticals/warehouses/index.html','__'],
      ['Accounting',        ROOT + 'verticals/accounting/index.html','__'],
      ['HR',                ROOT + 'verticals/hr/index.html',   '__'],
      ['Maintenance',       ROOT + 'verticals/maintenance/index.html','__'],
      ['CCTV',              ROOT + 'verticals/cctv/index.html', '__'],
      ['Compliance',        ROOT + 'verticals/compliance/index.html','__'],
      ['Multisite',         ROOT + 'verticals/multisite/index.html','__'],
      ['Thrift',            ROOT + 'verticals/thrift/index.html','__'],
    ]},
    { label: 'Resources', items: [
      ['Sitemap',           ROOT + 'sitemap.html',              'sitemap'],
      ['GitHub',            'https://github.com/tate2301/huchu','__'],
    ]},
  ];

  // Kit nav configs (replaces portal-kit-nav.js)
  const KITS = {
    pos: {
      label: 'POS terminal', home: 'index.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['POS', null]],
      screens: [
        ['sale',        'Sale'],
        ['cashup',      'Cash-up'],
        ['counter',     'Counter'],
        ['refund',      'Refund'],
        ['customer',    'Customer'],
        ['z-report',    'Z-report'],
        ['void',        'Void'],
        ['item-search', 'Item search'],
        ['demo',        'Full demo'],
      ],
    },
    parent: {
      label: 'Parent portal', home: 'index.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Parent', null]],
      screens: [
        ['dashboard',       'Dashboard'],
        ['fees',            'Fees'],
        ['attendance',      'Attendance'],
        ['notice',          'Notice'],
        ['profile',         'Profile'],
        ['payment-history', 'Payments'],
        ['demo',            'Full demo'],
      ],
    },
    student: {
      label: 'Student portal', home: 'index.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Student', null]],
      screens: [
        ['dashboard',   'Dashboard'],
        ['timetable',   'Timetable'],
        ['marks',       'Marks'],
        ['assignments', 'Assignments'],
        ['profile',     'Profile'],
        ['library',     'Library'],
        ['demo',        'Full demo'],
      ],
    },
    teacher: {
      label: 'Teacher portal', home: 'index.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Teacher', null]],
      screens: [
        ['dashboard',       'Dashboard'],
        ['marks',           'Marks'],
        ['attendance-take', 'Take roll'],
        ['gradebook',       'Gradebook'],
        ['communications',  'Comms'],
        ['schedule',        'Schedule'],
        ['lesson-planner',  'Lessons'],
        ['demo',            'Full demo'],
      ],
    },
    staff: {
      label: 'Staff portal', home: 'index.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Staff', null]],
      screens: [
        ['dashboard',  'Dashboard'],
        ['leave',      'Leave'],
        ['payslip',    'Payslip'],
        ['time-clock', 'Time clock'],
        ['directory',  'Directory'],
        ['demo',       'Full demo'],
      ],
    },
    admin: {
      label: 'Admin portal', home: 'index.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Admin', null]],
      screens: [
        ['dashboard',    'Dashboard'],
        ['users',        'Users'],
        ['audit',        'Audit log'],
        ['billing',      'Billing'],
        ['integrations', 'Integrations'],
        ['demo',         'Full demo'],
      ],
    },
    gold: {
      label: 'Gold Mine Clerk', home: 'index.html',
      // Single-page kit: every screen below is a hash route inside demo.html;
      // the `demo` entry opens the demo home (no hash).
      singlePage: 'demo.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Gold Mine Clerk', null]],
      screens: [
        ['day-open',     'Day open'],
        ['pour-log',     'New pour'],
        ['pours',        'Pours'],
        ['shifts',       'Shifts'],
        ['groups',       'Groups'],
        ['people',       'Workers'],
        ['buy-gold',     'Buy gold'],
        ['my-day',       'My day'],
        ['dispatch',     'Dispatch'],
        ['sales',        'Sales'],
        ['batches',      'Batches'],
        ['shipments',    'Shipments'],
        ['settlements',  'Settlements'],
        ['vault',        'Vault'],
        ['royalty',      'Royalty'],
        ['demo',         'Full demo'],
      ],
    },
    scrap: {
      label: 'Scrap Yard Clerk', home: 'index.html',
      singlePage: 'demo.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Scrap Yard Clerk', null]],
      screens: [
        ['day-open',     'Day open'],
        ['intake',       'Weigh ticket'],
        ['suppliers',    'Suppliers'],
        ['payouts',      'Payouts'],
        ['stockpile',    'Stockpile'],
        ['dispatch',     'Dispatch'],
        ['reports',      'Reports'],
        ['end-of-day',   'End of day'],
        ['demo',         'Full demo'],
      ],
    },
    owner: {
      label: 'Owner / Manager', home: 'index.html',
      singlePage: 'demo.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Owner / Manager', null]],
      screens: [
        ['today',        'Today'],
        ['lobs',         'Lines of business'],
        ['branches',     'Branches'],
        ['cash',         'Cash on hand'],
        ['ar',           'Money owed to you'],
        ['ap',           'Money you owe'],
        ['flags',        'Flags'],
        ['pnl',          'Profit & loss'],
        ['forecast',     'Expected cash'],
        ['demo',         'Owner app'],
      ],
    },
    stash: {
      label: 'Stash · personal finance', home: 'index.html',
      // Single-page kit: every screen is a hash route inside demo.html.
      singlePage: 'demo.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Portals', ROOT + 'portals/index.html'], ['Stash', null]],
      screens: [
        ['sign-in',             'Sign in'],
        ['home',                'Home'],
        ['transactions',        'Transactions'],
        ['transaction-detail',  'Transaction detail'],
        ['accounts',            'Accounts'],
        ['account-detail',      'Account detail'],
        ['add-account',         'Add account'],
        ['budgets',             'Budgets'],
        ['budget-detail',       'Budget detail'],
        ['subscriptions',       'Subscriptions'],
        ['goals',               'Goals'],
        ['goal-detail',         'Goal detail'],
        ['insights',            'Insights'],
        ['cashflow',            'Cashflow'],
        ['categories',          'Categories'],
        ['profile',             'Profile'],
        ['settings',            'Settings'],
        ['billing',             'Plan & billing'],
        ['onboarding',          'Onboarding'],
        ['notifications',       'Notifications'],
        ['demo',                'Full demo'],
      ],
    },
    dashboard: {
      label: 'Dashboard kit', home: ROOT + 'index.html',
      crumbs: [['Home', ROOT + 'index.html'], ['Kits', ROOT + 'index.html#kits'], ['Dashboard', null]],
      screens: [
        ['overview',        'Overview'],
        ['data-heavy',      'Data tables'],
        ['lists',           'Lists'],
        ['posting-studio',  'Posting'],
        ['journal-detail',  'Journal'],
        ['batch-detail',    'Batch'],
        ['employee-detail', 'Employee'],
        ['import-ledger',   'Import'],
        ['notifications',   'Notifications'],
        ['settings',        'Settings'],
        ['signin',          'Sign-in'],
      ],
    },
  };

  // -------- Render helpers ------------------------------------------------
  function isActiveSection(s) {
    if (s.match instanceof RegExp) return s.match.test(PATH);
    return false;
  }

  function renderMainNav() {
    const nav = document.createElement('header');
    nav.className = 'hx-main-nav';
    nav.innerHTML = `
      <div class="hx-main-nav-l">
        <button class="hx-nav-toggle" aria-label="Toggle navigation" aria-expanded="false" title="Toggle sidebar (\\)">
          <span data-icon="menu" data-icon-size="18"></span>
        </button>
        <a class="hx-brand" href="${ROOT}index.html">
          <span class="mark" data-icon="corelith" data-icon-size="22"></span>
          <span class="name">Huchu</span>
          <span class="badge">DS&nbsp;·&nbsp;0.5</span>
        </a>
      </div>
      <nav class="hx-main-nav-c" aria-label="Primary">
        ${SECTIONS.map(s => `
          <a href="${s.href}" class="${isActiveSection(s) ? 'current' : ''}">${s.label}</a>
        `).join('')}
      </nav>
      <div class="hx-main-nav-r">
        <div class="hx-search" role="search">
          <span data-icon="search" data-icon-size="14"></span>
          <input type="search" placeholder="Search the system…" aria-label="Search" />
          <span class="kbd-hint">⌘K</span>
        </div>
        <a class="hx-icon-btn" href="https://github.com/tate2301/huchu" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">
          <span data-icon="external" data-icon-size="14"></span>
        </a>
        <button class="hx-icon-btn hx-theme-toggle" type="button" aria-label="Toggle theme" title="Theme (coming soon)">
          <span data-icon="sparkles" data-icon-size="14"></span>
        </button>
      </div>
    `;
    return nav;
  }

  // Resolve the active screen slug for a kit. For single-page kits the
  // active state lives in `location.hash` (#/<slug>), not in the filename.
  // For multi-page kits each screen has its own .html so we use the filename.
  // The 'demo' slug stays active when the user is on the demo home (no hash).
  function activeScreenFor(kit) {
    if (kit.singlePage) {
      const h = location.hash.replace(/^#\/?/, '');
      if (h) return h;
      if (CURRENT_FILE === 'demo') return 'demo';
      return null;
    }
    return CURRENT_FILE;
  }

  function renderKitNav() {
    const kitId = document.body.dataset.kitNav;
    if (!kitId || !KITS[kitId]) return null;
    // Live demo apps opt out — their own bottom-tab nav is the primary nav.
    // The huchu kit-nav is only useful on multi-page catalogs/kits where it
    // helps jump between sibling pages. Live SPAs already have that built in.
    if (document.body.classList.contains('hx-no-kit-nav')) return null;
    const kit = KITS[kitId];
    const current = activeScreenFor(kit);

    const nav = document.createElement('div');
    nav.className = 'hx-kit-nav';
    nav.innerHTML = `
      <div class="hx-kit-nav-l">
        <nav class="hx-crumbs" aria-label="Breadcrumb">
          ${kit.crumbs.map(([label, href], i, arr) => {
            const last = i === arr.length - 1;
            const sep = last ? '' : '<span class="sep">/</span>';
            return href
              ? `<a href="${href}">${label}</a>${sep}`
              : `<span class="cur">${label}</span>${sep}`;
          }).join('')}
        </nav>
      </div>
      <nav class="hx-kit-nav-c" aria-label="Kit screens">
        ${kit.screens.map(([slug, label]) => {
          const cur = slug === current ? ' current' : '';
          // Single-page kits route everything through demo.html#/<slug>;
          // the demo entry itself drops the hash to land on the demo home.
          const href = kit.singlePage
            ? (slug === 'demo' ? kit.singlePage : `${kit.singlePage}#/${slug}`)
            : `${slug}.html`;
          return `<a href="${href}" class="hx-kit-tab${cur}">${label}</a>`;
        }).join('')}
      </nav>
      <div class="hx-kit-nav-r">
        <a class="hx-icon-btn" href="${current}.html" target="_blank" rel="noopener" aria-label="Open in new tab" title="Open in new tab">
          <span data-icon="external" data-icon-size="14"></span>
        </a>
        <button class="hx-icon-btn hx-fullscreen-toggle" type="button" aria-label="Toggle fullscreen" title="Fullscreen">
          <span data-icon="grid" data-icon-size="14"></span>
        </button>
      </div>
    `;
    return nav;
  }

  // Which sidebar group should be highlighted for the current URL?
  // A group is active if any of its items matches the current file, or if
  // the page belongs to that section's catalog (p-*, b-*, x-*, guide-*, etc.).
  function activeGroupLabel() {
    // 1. Direct item-key match wins.
    for (const group of SIDEBAR) {
      for (const item of group.items) {
        const key = item[2];
        if (key && key !== '__' && key === CURRENT_FILE) return group.label;
      }
    }
    // 2. Catalog/prefix matching for component-style pages. With the cookbook-
    //    first IA, everything design-system rolls up into one Reference group.
    const f = CURRENT_FILE;
    if (/\/cookbook\//.test(PATH))           return 'Cookbook';
    if (/^p-/.test(f) || f === 'primitives') return 'Reference';
    if (/^b-/.test(f) || f === 'blocks')     return 'Reference';
    if (/^x-/.test(f) || f === 'patterns' || /^pg-/.test(f) || f === 'pages' || f === 'shells') return 'Reference';
    if (/^guide-/.test(f) || f === 'guides') return 'Reference';
    if (['colors','typography','spacing','elevation','motion','iconography','accessibility','foundations','voice','content','tokens'].includes(f)) return 'Reference';
    if (['get-started','install','changelog','principles'].includes(f)) return 'Get started';
    if (/\/portals\//.test(PATH))             return 'Apps';
    if (/\/(kits|verticals)\//.test(PATH))    return 'Catalogs';
    if (f === 'sitemap')                      return 'Resources';
    return null;
  }

  // -------- Sidebar persistence (localStorage) ----------------------------
  const LS_PINNED  = 'huchu-side:pinned';
  const LS_RECENTS = 'huchu-side:recents';
  const LS_OPEN    = 'huchu-side:open';

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // The "stable id" for pinned/recent persistence. We use the link key when
  // available (so a moved file keeps its pin) and fall back to the href.
  function itemId(item) {
    const [, href, key] = item;
    if (key && key !== '__') return 'k:' + key;
    return 'h:' + href;
  }

  // Find an item in SIDEBAR by id. Returns {item, group} or null.
  function findItemById(id) {
    for (const group of SIDEBAR) {
      for (const item of group.items) {
        if (itemId(item) === id) return { item, group };
      }
    }
    return null;
  }

  // Identify the currently-active link (returns the SIDEBAR item array or null).
  function currentActiveItem() {
    for (const group of SIDEBAR) {
      for (const item of group.items) {
        const key = item[2];
        if (key && key !== '__' && key === CURRENT_FILE) return { item, group };
      }
    }
    return null;
  }

  // Build the contextual breadcrumb "Group → Item" for the active page.
  function activeBreadcrumb() {
    const hit = currentActiveItem();
    if (!hit) return null;
    return { group: hit.group.label, label: hit.item[0] };
  }

  // Record the current page as a recent visit (most-recent first, capped at 8).
  function recordRecent() {
    const hit = currentActiveItem();
    if (!hit) return;
    const id = itemId(hit.item);
    const recents = lsGet(LS_RECENTS, []).filter(r => r.id !== id);
    recents.unshift({ id, label: hit.item[0], href: hit.item[1] });
    lsSet(LS_RECENTS, recents.slice(0, 8));
  }

  // -------- Sidebar render ------------------------------------------------
  function buildLinkAnchor(label, href, key, tag, icon, isCur, id, pinned) {
    const iconHtml = icon ? `<span class="hx-side-ic" data-icon="${icon}" data-icon-size="14"></span>` : '';
    const tagHtml = tag ? `<span class="hx-side-tag">${tag}</span>` : '';
    const pinIcon = pinned ? 'pin' : 'pin';
    const pinTitle = pinned ? 'Unpin' : 'Pin';
    const pinPressed = pinned ? 'true' : 'false';
    const curAttr = isCur ? ' aria-current="page"' : '';
    return `<div class="hx-side-row${pinned ? ' is-pinned' : ''}${isCur ? ' is-current' : ''}" data-side-row data-id="${id}">
      <a href="${href}" class="hx-side-link${isCur ? ' current' : ''}" data-side-link${curAttr}>${iconHtml}<span class="hx-side-lb">${label}</span>${tagHtml}</a>
      <button type="button" class="hx-side-pin" aria-pressed="${pinPressed}" aria-label="${pinTitle} ${label.replace(/"/g,'&quot;')}" title="${pinTitle}" data-side-pin>
        <span data-icon="${pinIcon}" data-icon-size="12"></span>
      </button>
    </div>`;
  }

  function renderSidebar() {
    const aside = document.createElement('aside');
    aside.className = 'hx-sidebar';
    aside.setAttribute('aria-label', 'Site navigation');
    const activeGroup = activeGroupLabel();
    const crumb = activeBreadcrumb();
    const pinned = lsGet(LS_PINNED, []);
    const recents = lsGet(LS_RECENTS, []);
    const savedOpen = lsGet(LS_OPEN, {});

    const breadcrumbHtml = crumb
      ? `<div class="hx-side-crumbs" aria-label="Current location">
           <span class="hx-side-crumbs-g">${crumb.group}</span>
           <span class="hx-side-crumbs-sep" aria-hidden="true">›</span>
           <span class="hx-side-crumbs-i">${crumb.label}</span>
         </div>`
      : '';

    aside.innerHTML = `
      <div class="hx-sidebar-head">
        <a class="hx-brand" href="${ROOT}index.html">
          <span class="mark" data-icon="corelith" data-icon-size="20"></span>
          <span class="name">Huchu</span>
          <span class="badge">DS&nbsp;·&nbsp;0.5</span>
        </a>
        <button class="hx-icon-btn hx-pin-toggle" type="button" aria-label="Pin sidebar" title="Pin sidebar (desktop)">
          <span data-icon="sidebar" data-icon-size="14"></span>
        </button>
        <button class="hx-icon-btn hx-sidebar-close" type="button" aria-label="Close sidebar">
          <span data-icon="x" data-icon-size="14"></span>
        </button>
      </div>
      <div class="hx-sidebar-body">
        ${breadcrumbHtml}
        <div class="hx-side-search" role="search">
          <span data-icon="search" data-icon-size="13"></span>
          <input type="search" placeholder="Filter navigation…" aria-label="Filter navigation" data-side-search />
          <span class="hx-side-search-kbd" aria-hidden="true">/</span>
        </div>
        <div class="hx-side-empty" data-side-empty hidden>
          No items match. <button type="button" class="hx-side-empty-clear" data-side-empty-clear>Clear</button>
        </div>
        <div class="hx-side-count" data-side-count hidden></div>

        <div class="hx-side-dyn" data-side-dyn>
          ${renderDynamicSection('Pinned', 'pinned', pinned.map(id => findItemById(id)).filter(Boolean).map(x => x.item), savedOpen)}
          ${renderDynamicSection('Recent', 'recent', recents.map(r => findItemById(r.id)).filter(Boolean).map(x => x.item), savedOpen)}
        </div>

        ${SIDEBAR.map(group => {
          const isActive = group.label === activeGroup;
          // Open precedence: saved state if present, else active group is open.
          let isOpen;
          if (Object.prototype.hasOwnProperty.call(savedOpen, group.label)) {
            isOpen = !!savedOpen[group.label];
          } else {
            isOpen = isActive;
          }
          const openAttr = isOpen ? ' open' : '';
          return `
          <details class="hx-side-group${isActive ? ' active' : ''}"${openAttr} data-group="${group.label}">
            <summary aria-expanded="${isOpen ? 'true' : 'false'}">
              <span class="lb">${group.label}</span>
              <span class="hx-side-chev" data-icon="chevron" data-icon-size="14"></span>
            </summary>
            <div class="hx-side-items">
              ${group.items.map(item => {
                const [label, href, key, tag, icon] = item;
                const isCur = key && key !== '__' && key === CURRENT_FILE;
                const id = itemId(item);
                const isPinned = pinned.indexOf(id) !== -1;
                return buildLinkAnchor(label, href, key, tag, icon, isCur, id, isPinned);
              }).join('')}
            </div>
          </details>`;
        }).join('')}
      </div>
      <div class="hx-sidebar-foot">
        © 2026 Huchu · <a href="${ROOT}system/changelog.html">Changelog</a> · <a href="${ROOT}system/install.html">Install</a>
      </div>
    `;
    return aside;
  }

  // Pinned + Recent live as their own collapsible <details> blocks at the
  // very top of the body. Hidden entirely when there's nothing to show.
  function renderDynamicSection(label, slug, items, savedOpen) {
    if (!items || !items.length) return '';
    const pinned = lsGet(LS_PINNED, []);
    const savedKey = '__' + slug;
    const isOpen = Object.prototype.hasOwnProperty.call(savedOpen, savedKey)
      ? !!savedOpen[savedKey] : true;
    const openAttr = isOpen ? ' open' : '';
    return `
      <details class="hx-side-group hx-side-group--dyn"${openAttr} data-group="${savedKey}">
        <summary aria-expanded="${isOpen ? 'true' : 'false'}">
          <span class="lb">${label}</span>
          <span class="hx-side-count-pill">${items.length}</span>
          <span class="hx-side-chev" data-icon="chevron" data-icon-size="14"></span>
        </summary>
        <div class="hx-side-items">
          ${items.map(item => {
            const [lbl, href, key, tag, icon] = item;
            const isCur = key && key !== '__' && key === CURRENT_FILE;
            const id = itemId(item);
            const isPinned = pinned.indexOf(id) !== -1;
            return buildLinkAnchor(lbl, href, key, tag, icon, isCur, id, isPinned);
          }).join('')}
        </div>
      </details>`;
  }

  // -------- Mount + wiring ------------------------------------------------
  const PIN_KEY = 'huchu-nav-sidebar-pinned';
  const DESKTOP_MIN = 1280;

  function setNavHeights(mainEl, kitEl) {
    const mh = mainEl ? mainEl.offsetHeight : 0;
    const kh = kitEl ? kitEl.offsetHeight : 0;
    document.documentElement.style.setProperty('--hx-main-nav-h', mh + 'px');
    document.documentElement.style.setProperty('--hx-kit-nav-h', kh + 'px');
    document.documentElement.style.setProperty('--hx-nav-h', (mh + kh) + 'px');
  }

  function mount() {
    // Opt out
    if (document.body.classList.contains('hx-no-nav') ||
        document.body.classList.contains('is-fullscreen')) {
      return;
    }
    if (document.querySelector('.hx-main-nav')) return; // already mounted

    // Strip legacy nav markup so we don't double-nav. We keep their <header>s
    // intact by removing only the ones we know we're replacing.
    document.querySelectorAll('.ds-slim-nav, .hx-topbar').forEach(el => el.remove());

    document.body.classList.add('hx-nav-mounted');

    // Record visit BEFORE the sidebar renders so Recent shows current page too.
    recordRecent();

    const mainNav = renderMainNav();
    const kitNav  = renderKitNav();
    const sidebar = renderSidebar();
    const scrim   = document.createElement('div');
    scrim.className = 'hx-sidebar-scrim';

    document.body.insertBefore(mainNav, document.body.firstChild);
    if (kitNav) mainNav.insertAdjacentElement('afterend', kitNav);
    document.body.appendChild(sidebar);
    document.body.appendChild(scrim);

    // Centre the active screen tab in view. On mobile the screen tabs are
    // pinned to the bottom as a horizontally-scrollable bar, so we make
    // sure the .current chip is always visible without the user dragging.
    function scrollActiveTabIntoView() {
      const tab = document.querySelector('.hx-kit-tab.current');
      if (!tab) return;
      try {
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (e) { /* older browsers */ }
    }
    scrollActiveTabIntoView();

    // For single-page kits, sync the kit-nav active tab to the current hash
    // every time the user navigates. The kit-nav re-renders so the .current
    // class lands on the right tab without a page reload.
    const kitId = document.body.dataset.kitNav;
    if (kitId && KITS[kitId] && KITS[kitId].singlePage) {
      window.addEventListener('hashchange', () => {
        const old = document.querySelector('.hx-kit-nav');
        if (!old) return;
        const fresh = renderKitNav();
        if (fresh) {
          old.replaceWith(fresh);
          if (window.Icons && window.Icons.render) window.Icons.render(fresh);
          scrollActiveTabIntoView();
        }
      });
    }

    // Compute + maintain nav heights as CSS vars
    const measure = () => setNavHeights(mainNav, kitNav);
    measure();
    window.addEventListener('resize', measure);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(measure);
      ro.observe(mainNav);
      if (kitNav) ro.observe(kitNav);
    }

    // ── Sidebar drawer / pin behaviour ────────────────────────────────
    const toggleBtn   = mainNav.querySelector('.hx-nav-toggle');
    const closeBtn    = sidebar.querySelector('.hx-sidebar-close');
    const pinBtn      = sidebar.querySelector('.hx-pin-toggle');

    function isDesktop() { return window.innerWidth >= DESKTOP_MIN; }

    let lastFocusedBeforeOpen = null;

    function open() {
      lastFocusedBeforeOpen = document.activeElement;
      sidebar.classList.add('open');
      scrim.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      sidebar.classList.remove('open');
      scrim.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      // Return focus to the hamburger trigger (or whoever launched it).
      try {
        if (lastFocusedBeforeOpen && document.contains(lastFocusedBeforeOpen)) {
          lastFocusedBeforeOpen.focus();
        } else {
          toggleBtn.focus();
        }
      } catch (e) {}
    }
    function toggle() {
      if (document.body.classList.contains('sidebar-pinned')) {
        // When pinned, the toggle button unpins
        unpin();
        return;
      }
      if (sidebar.classList.contains('open')) close(); else open();
    }

    function pin() {
      if (!isDesktop()) return; // pin is desktop-only
      document.body.classList.add('sidebar-pinned');
      sidebar.classList.add('pinned');
      sidebar.classList.remove('open');
      scrim.classList.remove('open');
      pinBtn.setAttribute('aria-pressed', 'true');
      try { localStorage.setItem(PIN_KEY, '1'); } catch (e) {}
    }
    function unpin() {
      document.body.classList.remove('sidebar-pinned');
      sidebar.classList.remove('pinned');
      pinBtn.setAttribute('aria-pressed', 'false');
      try { localStorage.setItem(PIN_KEY, '0'); } catch (e) {}
    }
    function togglePin() {
      if (document.body.classList.contains('sidebar-pinned')) unpin(); else pin();
    }

    toggleBtn.addEventListener('click', toggle);
    closeBtn.addEventListener('click', close);
    pinBtn.addEventListener('click', togglePin);
    scrim.addEventListener('click', close);
    // Close drawer on sidebar link click (but not when pinned). We
    // discriminate: pin buttons are NOT links, so they don't trigger close.
    sidebar.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      if (document.body.classList.contains('sidebar-pinned')) return;
      setTimeout(close, 80);
    });

    // ── Sidebar: filter, pin toggles, group persistence, keyboard nav ─
    const searchInput   = sidebar.querySelector('[data-side-search]');
    const countEl       = sidebar.querySelector('[data-side-count]');
    const emptyEl       = sidebar.querySelector('[data-side-empty]');
    const emptyClearBtn = sidebar.querySelector('[data-side-empty-clear]');
    const dynRoot       = sidebar.querySelector('[data-side-dyn]');

    // Snapshot of per-group open state captured the first time we start
    // filtering. Restored when the filter clears, so search doesn't clobber
    // the user's collapsed/expanded preferences.
    let filterOpenSnapshot = null;

    function applyFilter(q) {
      const needle = (q || '').trim().toLowerCase();
      const groups = sidebar.querySelectorAll('.hx-side-group');
      if (needle && !filterOpenSnapshot) {
        filterOpenSnapshot = new Map();
        groups.forEach(g => filterOpenSnapshot.set(g, g.open));
      }
      const rows = sidebar.querySelectorAll('[data-side-row]');
      let total = 0, visible = 0;
      rows.forEach(row => {
        total++;
        const lbl = row.querySelector('.hx-side-lb');
        const text = lbl ? lbl.textContent.toLowerCase() : '';
        const match = !needle || text.indexOf(needle) !== -1;
        row.hidden = !match;
        if (match) visible++;
      });
      suppressTogglePersist = true;
      groups.forEach(g => {
        const anyVisible = g.querySelector('[data-side-row]:not([hidden])');
        g.hidden = !anyVisible;
        if (needle) {
          if (anyVisible) g.open = true;
        } else if (filterOpenSnapshot) {
          // Restore to pre-filter state.
          g.open = !!filterOpenSnapshot.get(g);
        }
      });
      // The toggle event for <details> fires async — keep the flag set until
      // the next microtask flushes so all programmatic toggles are skipped.
      Promise.resolve().then(() => { suppressTogglePersist = false; });
      if (!needle) filterOpenSnapshot = null;

      if (needle) {
        countEl.hidden = false;
        countEl.textContent = visible + ' of ' + total + ' items';
        emptyEl.hidden = visible !== 0;
      } else {
        countEl.hidden = true;
        emptyEl.hidden = true;
      }
    }
    if (searchInput) {
      searchInput.addEventListener('input', () => applyFilter(searchInput.value));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (searchInput.value) {
            searchInput.value = '';
            applyFilter('');
            e.stopPropagation();
          }
        }
      });
    }
    if (emptyClearBtn) {
      emptyClearBtn.addEventListener('click', () => {
        if (searchInput) { searchInput.value = ''; applyFilter(''); searchInput.focus(); }
      });
    }

    // Pin toggle (delegated): click pin button to add/remove from pinned set,
    // then re-render only the dynamic section so the rest of the sidebar (and
    // each item's solid-vs-outline state) stays consistent.
    function refreshDynamic() {
      if (!dynRoot) return;
      const pinned = lsGet(LS_PINNED, []);
      const recents = lsGet(LS_RECENTS, []);
      const savedOpen = lsGet(LS_OPEN, {});
      dynRoot.innerHTML =
        renderDynamicSection('Pinned', 'pinned', pinned.map(id => findItemById(id)).filter(Boolean).map(x => x.item), savedOpen) +
        renderDynamicSection('Recent', 'recent', recents.map(r => findItemById(r.id)).filter(Boolean).map(x => x.item), savedOpen);
      if (window.Icons && window.Icons.render) window.Icons.render(dynRoot);
      // Re-apply pinned state visuals on the static groups (button aria-pressed).
      sidebar.querySelectorAll('[data-side-row]').forEach(row => {
        const id = row.getAttribute('data-id');
        const isP = pinned.indexOf(id) !== -1;
        row.classList.toggle('is-pinned', isP);
        const btn = row.querySelector('[data-side-pin]');
        if (btn) btn.setAttribute('aria-pressed', isP ? 'true' : 'false');
      });
      // Preserve filter if active.
      if (searchInput && searchInput.value) applyFilter(searchInput.value);
    }

    function togglePinId(id) {
      const pinned = lsGet(LS_PINNED, []);
      const idx = pinned.indexOf(id);
      if (idx === -1) pinned.unshift(id);
      else pinned.splice(idx, 1);
      lsSet(LS_PINNED, pinned);
      refreshDynamic();
    }

    sidebar.addEventListener('click', (e) => {
      const pinBtn2 = e.target.closest('[data-side-pin]');
      if (!pinBtn2) return;
      e.preventDefault();
      e.stopPropagation();
      const row = pinBtn2.closest('[data-side-row]');
      if (!row) return;
      togglePinId(row.getAttribute('data-id'));
    });

    // Persist <details> open/closed state per group label. We skip persistence
    // while the search filter is forcing groups open — otherwise typing would
    // clobber the user's real open/closed preferences.
    let suppressTogglePersist = false;
    sidebar.addEventListener('toggle', (e) => {
      const det = e.target;
      if (!det.matches || !det.matches('.hx-side-group')) return;
      const sum = det.querySelector('summary');
      if (sum) sum.setAttribute('aria-expanded', det.open ? 'true' : 'false');
      if (suppressTogglePersist) return;
      const label = det.getAttribute('data-group');
      if (!label) return;
      const state = lsGet(LS_OPEN, {});
      state[label] = det.open;
      lsSet(LS_OPEN, state);
    }, true);

    // Keyboard navigation inside the sidebar.
    function visibleSidebarItems() {
      return Array.from(sidebar.querySelectorAll('[data-side-link]'))
        .filter(el => {
          const row = el.closest('[data-side-row]');
          if (row && row.hidden) return false;
          const group = el.closest('.hx-side-group');
          if (group && group.hidden) return false;
          // Inside a closed <details>, items are hidden.
          if (group && !group.open) return false;
          return true;
        });
    }

    sidebar.addEventListener('keydown', (e) => {
      // '/' inside the sidebar focuses search (mirror of global handler).
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        if (searchInput) searchInput.focus();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = visibleSidebarItems();
        if (!items.length) return;
        e.preventDefault();
        const cur = document.activeElement;
        let idx = items.indexOf(cur);
        if (e.key === 'ArrowDown') idx = (idx + 1) % items.length;
        else idx = (idx - 1 + items.length) % items.length;
        items[idx].focus();
      } else if (e.key === 'Enter') {
        if (document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-side-link]')) {
          // Default anchor behaviour handles navigation; nothing extra needed.
        }
      }
    });

    // Global keyboard: Escape closes; \ toggles; / focuses sidebar search
    // (when not typing in another field).
    document.addEventListener('keydown', (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      if (e.key === 'Escape') {
        if (document.activeElement === searchInput && searchInput.value) {
          // Esc in search clears first, doesn't close.
          return;
        }
        if (sidebar.classList.contains('open')) close();
      }
      if (e.key === '\\' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggle();
      }
      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Only intercept when the drawer is open or pinned — otherwise let '/'
        // pass through for normal find/typing.
        const drawerActive = sidebar.classList.contains('open') ||
                             document.body.classList.contains('sidebar-pinned');
        if (drawerActive && searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    // Focus trap: when the drawer is open (and not pinned), Tab cycles inside.
    sidebar.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (!sidebar.classList.contains('open')) return;
      if (document.body.classList.contains('sidebar-pinned')) return;
      const focusables = sidebar.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter(el => {
        // Skip hidden rows / hidden groups.
        const row = el.closest('[data-side-row]');
        if (row && row.hidden) return false;
        const grp = el.closest('.hx-side-group');
        if (grp && grp.hidden) return false;
        return el.offsetParent !== null || el === document.activeElement;
      });
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    // Touch: swipe-from-left-edge to open, swipe-right-on-drawer to close.
    const SWIPE_THRESHOLD = 60;
    const EDGE_ZONE = 24;
    let touchStartX = null, touchStartY = null, touchTarget = null;
    document.addEventListener('touchstart', (e) => {
      if (isDesktop()) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      if (sidebar.classList.contains('open') && sidebar.contains(e.target)) {
        touchTarget = 'drawer';
      } else if (!sidebar.classList.contains('open') && t.clientX <= EDGE_ZONE) {
        touchTarget = 'edge';
      } else {
        touchTarget = null;
      }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (touchStartX == null || !touchTarget) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = Math.abs(t.clientY - touchStartY);
      if (dy > 40) { touchTarget = null; return; } // mostly-vertical = scroll
      if (touchTarget === 'edge' && dx > SWIPE_THRESHOLD) {
        open();
        touchTarget = null;
      } else if (touchTarget === 'drawer' && dx < -SWIPE_THRESHOLD) {
        close();
        touchTarget = null;
      }
    }, { passive: true });
    document.addEventListener('touchend', () => {
      touchStartX = touchStartY = null;
      touchTarget = null;
    }, { passive: true });

    // Restore pinned state (desktop only)
    try {
      if (localStorage.getItem(PIN_KEY) === '1' && isDesktop()) pin();
    } catch (e) {}

    // If viewport shrinks below desktop while pinned, auto-unpin
    window.addEventListener('resize', () => {
      if (document.body.classList.contains('sidebar-pinned') && !isDesktop()) {
        unpin();
      }
      // Update pin button visibility
      pinBtn.style.display = isDesktop() ? '' : 'none';
    });
    pinBtn.style.display = isDesktop() ? '' : 'none';

    // ── Kit nav: fullscreen toggle / open-in-new-tab ──────────────────
    if (kitNav) {
      const fs = kitNav.querySelector('.hx-fullscreen-toggle');
      if (fs) {
        fs.addEventListener('click', () => {
          // Add ?fullscreen=1 — pages that want it can read the param.
          // Without a clear shared contract, simplest behavior is to navigate
          // to current page with the param so the page can choose to hide chrome.
          const u = new URL(location.href);
          if (u.searchParams.get('fullscreen') === '1') {
            u.searchParams.delete('fullscreen');
          } else {
            u.searchParams.set('fullscreen', '1');
          }
          location.href = u.toString();
        });
      }
    }

    // ── Cmd/Ctrl+K focuses search ─────────────────────────────────────
    const topSearchInput = mainNav.querySelector('.hx-search input');
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (topSearchInput) topSearchInput.focus();
      }
    });

    // ── Fullscreen-from-query: if ?fullscreen=1, hide chrome ──────────
    const params = new URLSearchParams(location.search);
    if (params.get('fullscreen') === '1') {
      document.body.classList.add('is-fullscreen');
      mainNav.style.display = 'none';
      if (kitNav) kitNav.style.display = 'none';
      sidebar.style.display = 'none';
      scrim.style.display = 'none';
      document.documentElement.style.setProperty('--hx-nav-h', '0px');
    }

    // Expose API
    window.HuchuNav = { open, close, toggle, pin, unpin, togglePin };

    // Render icons inside the injected chrome
    if (window.Icons && window.Icons.render) {
      window.Icons.render(mainNav);
      if (kitNav) window.Icons.render(kitNav);
      window.Icons.render(sidebar);
    }
  }

  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
