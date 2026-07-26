import {
  ArrowRightLeft,
  BarChart3,
  Building2,
  Calendar,
  ChartLine,
  CheckCircle,
  ClipboardList,
  Coins,
  Dashboard,
  Factory,
  FileText,
  History,
  LifeBuoy,
  LocalShipping,
  Mail,
  Megaphone,
  Package,
  PackageCheck,
  Payments,
  ReceiptLong,
  ShieldCheck,
  Storefront,
  TrendingUp,
  Users,
  Wallet,
  Warehouse,
  WifiOff,
  Work,
  Wrench,
  type LucideIcon,
} from "@/lib/icons";

export type SeoEntry = {
  title: string;
  description: string;
  path: string;
  keywords: string[];
};

export type ProductVisual = {
  eyebrow: string;
  title: string;
  status: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  primaryRows: Array<{ label: string; value: string; meta: string }>;
  secondaryRows: Array<{ label: string; value: string; tone: "neutral" | "warn" | "success" }>;
};

/**
 * A customer segment with its own page under `/home/solutions`.
 *
 * Every segment runs the same order-to-cash loop — the landing page sells that
 * loop once, and these entries only describe how each business shapes the
 * `deliver` step in the middle of it. Schools are deliberately not a segment:
 * they buy per term against enrolment and live at `/home/schools`.
 */
export type MarketingSegment = {
  slug: string;
  legacySlugs: string[];
  /** Key into `PRODUCT_COMMERCIALS` in `lib/marketing/pricing.ts`. */
  pricingSlug: string;
  title: string;
  navTitle: string;
  /** Plain-language list of the businesses this covers. Used in nav and cards. */
  who: string;
  eyebrow: string;
  headline: string;
  summary: string;
  audience: string;
  cta: string;
  whatsapp: string;
  icon: LucideIcon;
  /** How this business shapes the `deliver` step of the shared loop. */
  deliverStep: { label: string; copy: string };
  /** The segment's own six-step operating motion. */
  workflow: string[];
  /** Three sharp lines shown in the landing-page segment switcher. */
  landingPains: string[];
  /** The single number the switcher panel leads with. */
  landingProof: { value: string; label: string };
  seo: SeoEntry;
  productVisual: ProductVisual;
  pains: string[];
  capabilities: Array<{ title: string; copy: string; icon: LucideIcon }>;
  outcomes: string[];
  proofMetrics: Array<{ value: string; label: string }>;
  modules: string[];
};

export const WHATSAPP_NUMBER = "263784939111";
export const WHATSAPP_DISPLAY = "+263 78 493 9111";

export function whatsappHref(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const navItems = [
  { label: "Product", href: "/home/products" },
  { label: "Solutions", href: "/home/solutions" },
  { label: "Pricing", href: "/home/pricing" },
  { label: "Schools", href: "/home/schools" },
  { label: "Company", href: "/home/about" },
];

export const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Platform overview", href: "/home/products" },
      { label: "Pricing", href: "/home/pricing" },
      { label: "Implementation", href: "/home/implementation-support" },
      { label: "FAQ", href: "/home/faq" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Sellers", href: "/home/solutions/sellers" },
      { label: "Service providers", href: "/home/solutions/service-providers" },
      { label: "Workshops", href: "/home/solutions/workshops" },
      { label: "Manufacturers", href: "/home/solutions/manufacturers" },
      { label: "Sales teams", href: "/home/solutions/sales-teams" },
      { label: "Schools", href: "/home/schools" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/home/about" },
      { label: "Contact", href: "/home/contact" },
      { label: "Founding partner", href: "/home/founding-partner" },
      { label: "Privacy", href: "/home/privacy" },
      { label: "Terms", href: "/home/terms" },
    ],
  },
];

const HOME_DESCRIPTION =
  "Corelith runs the loop every trading business lives on: quote, order, deliver, invoice, get paid. One system for sellers, service providers, workshops, manufacturers and sales teams in Zimbabwe.";

export const seoPages = {
  home: {
    title: "One system from the enquiry to the money in the bank",
    description: HOME_DESCRIPTION,
    path: "/home",
    keywords: [
      "business software Zimbabwe",
      "stock control software Zimbabwe",
      "invoicing and inventory software Zimbabwe",
      "job card software Zimbabwe",
      "manufacturing software Zimbabwe",
      "sales CRM Zimbabwe",
      "ZIMRA fiscalisation software",
    ],
  },
  root: {
    title: "One system from the enquiry to the money in the bank",
    description: HOME_DESCRIPTION,
    path: "/",
    keywords: [
      "business software Zimbabwe",
      "stock control software Zimbabwe",
      "invoicing software Zimbabwe",
      "job card software Zimbabwe",
      "sales CRM Zimbabwe",
    ],
  },
  platform: {
    title: "The Corelith platform",
    description:
      "Every module on Corelith: Sell, Stock, Work, Books and People, plus the industry packs and add-ons you can switch on when they pay for themselves.",
    path: "/home/products",
    keywords: [
      "business platform Zimbabwe",
      "inventory accounting CRM software",
      "ERP modules Zimbabwe",
      "Corelith modules and features",
    ],
  },
  solutions: {
    title: "Corelith solutions by business type",
    description:
      "Sellers, service providers, workshops, manufacturers and sales teams run the same order-to-cash loop. Corelith arrives with each one already configured.",
    path: "/home/solutions",
    keywords: [
      "retail wholesale software Zimbabwe",
      "service business software Zimbabwe",
      "workshop management software Zimbabwe",
      "manufacturing software Zimbabwe",
      "sales team CRM Zimbabwe",
    ],
  },
  pricing: {
    title: "Corelith pricing",
    description:
      "Priced per site, never per user. Plans start low, every seat is included up to your ceiling, and onboarding is scoped and quoted before you commit.",
    path: "/home/pricing",
    keywords: [
      "Corelith pricing",
      "ERP pricing Zimbabwe",
      "business software cost Zimbabwe",
      "per site pricing software",
    ],
  },
  schools: {
    title: "Corelith for schools",
    description:
      "Admissions, fees, academics, boarding and parent portals on one system. Priced per term against enrolment, with an implementation-led rollout for school leadership.",
    path: "/home/schools",
    keywords: [
      "school management software Zimbabwe",
      "school fees system Zimbabwe",
      "student information system Zimbabwe",
      "parent portal Zimbabwe",
      "school ERP Zimbabwe",
    ],
  },
  implementation: {
    title: "Implementation and support",
    description:
      "The Launch Sprint covers workflow mapping, data import, configuration, training, go-live support and WhatsApp follow-up. Rollout is part of the product.",
    path: "/home/implementation-support",
    keywords: [
      "software implementation Zimbabwe",
      "ERP onboarding Zimbabwe",
      "business software migration",
      "Corelith Launch Sprint",
    ],
  },
  foundingPartner: {
    title: "Founding Partner Programme",
    description:
      "A limited programme for businesses ready to put Corelith into real operations, agree success targets before go-live, and hold the rate for twelve months.",
    path: "/home/founding-partner",
    keywords: [
      "Corelith founding partner",
      "Zimbabwe business software pilot",
      "workshop software pilot",
      "business software launch programme",
    ],
  },
  bookDemo: {
    title: "Find your Corelith setup",
    description:
      "Answer a short setup questionnaire so the demo starts from your industry, your locations, your current tools and the problem actually costing you money.",
    path: "/home/book-demo",
    keywords: [
      "book Corelith demo",
      "business software demo Zimbabwe",
      "inventory software demo",
      "workshop software demo",
    ],
  },
  about: {
    title: "About Corelith",
    description:
      "Corelith is built by Hurudza Labs in Zimbabwe for businesses that have outgrown spreadsheets but do not want a foreign-consultant ERP project.",
    path: "/home/about",
    keywords: [
      "Corelith Zimbabwe",
      "Hurudza Labs",
      "African business software",
      "Zimbabwe software company",
    ],
  },
  contact: {
    title: "Contact Corelith",
    description:
      "Reach Corelith on WhatsApp, by email, or through a tailored demo about selling, service, workshop, production, sales or school operations.",
    path: "/home/contact",
    keywords: [
      "contact Corelith",
      "Corelith WhatsApp",
      "business software Zimbabwe contact",
    ],
  },
  faq: {
    title: "Corelith FAQ",
    description:
      "Straight answers on fit, price, per-site billing, implementation, migration, offline use, ZIMRA fiscalisation and what happens after go-live.",
    path: "/home/faq",
    keywords: [
      "Corelith FAQ",
      "business software migration Zimbabwe",
      "Corelith implementation",
      "ZIMRA fiscalisation software",
    ],
  },
  privacy: {
    title: "Privacy",
    description:
      "How Corelith handles marketing enquiries, demo requests, contact details and business information shared through the website.",
    path: "/home/privacy",
    keywords: ["Corelith privacy", "Corelith data protection"],
  },
  terms: {
    title: "Terms",
    description:
      "Website terms for Corelith marketing information, demo requests, pricing indications and implementation conversations.",
    path: "/home/terms",
    keywords: ["Corelith terms", "Corelith website terms"],
  },
} satisfies Record<string, SeoEntry>;

// ---------------------------------------------------------------------------
// The shared loop — the one idea the landing page has to land
// ---------------------------------------------------------------------------

/**
 * Sellers, service providers, workshops, manufacturers and sales teams look
 * like five different businesses and buy like one. They all take a promise from
 * a customer, spend stock, people and time keeping it, then have to invoice and
 * collect. The middle step changes shape; the loop never does.
 */
export const ORDER_TO_CASH_LOOP = [
  {
    step: "Enquiry",
    copy: "A call, a walk-in, a WhatsApp message. It lands on a customer record instead of in someone's phone.",
    icon: Megaphone,
  },
  {
    step: "Quote",
    copy: "Priced off live stock and your real rates, sent as a document, tracked until it is accepted.",
    icon: FileText,
  },
  {
    step: "Order",
    copy: "The accepted quote becomes the order, with the deposit, the deadline and the owner attached.",
    icon: ClipboardList,
  },
  {
    step: "Deliver",
    copy: "Stock goes out, the job gets done, the batch gets made. This is the only step that changes by industry.",
    icon: LocalShipping,
  },
  {
    step: "Invoice",
    copy: "Built from what actually moved — not from what the quote guessed. Fiscalised where ZIMRA requires it.",
    icon: ReceiptLong,
  },
  {
    step: "Payment",
    copy: "Receipts, part-payments and balances land against the customer and post straight into the books.",
    icon: Coins,
  },
];

/** Everything that updates itself once the loop above is running in one place. */
export const LOOP_SIDE_EFFECTS = [
  { label: "Stock", copy: "Every issue, receipt and transfer moves the on-hand figure the moment it happens." },
  { label: "Books", copy: "Sales, purchases and payments post themselves. Your accountant stops rebuilding the year." },
  { label: "People", copy: "Every record carries the name of whoever created, approved or changed it." },
  { label: "Reports", copy: "Margin, ageing, stock cover and branch performance are a page, not a weekend." },
];

export const problemFragments = [
  {
    label: "WhatsApp",
    copy: "Orders, approvals and price promises live in chats nobody can search.",
    icon: Users,
  },
  {
    label: "Excel",
    copy: "Stock and branch reports depend on one person and the file they keep on one laptop.",
    icon: FileText,
  },
  {
    label: "Paper books",
    copy: "Delivery notes, job cards and receipts have to be re-typed before anyone can read them.",
    icon: ReceiptLong,
  },
  {
    label: "A separate POS",
    copy: "It takes the money but never tells purchasing, costing or accounts what happened.",
    icon: Storefront,
  },
  {
    label: "Staff memory",
    copy: "The real process is in people's heads, so it walks out when they resign.",
    icon: ClipboardList,
  },
];

export const connectedOutcomes = [
  "One customer record",
  "One stock position",
  "One set of books",
  "One version of the truth",
];

/** Honest, checkable claims. No logos, no invented testimonials. */
export const trustSignals = [
  { label: "Priced per site, never per user", icon: Users },
  { label: "Works with no internet, syncs when it returns", icon: WifiOff },
  { label: "ZIMRA fiscalisation built in", icon: ShieldCheck },
  { label: "Built and supported in Zimbabwe", icon: Building2 },
];

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

export const segments: MarketingSegment[] = [
  {
    slug: "sellers",
    legacySlugs: ["commerce", "retail-wholesale"],
    pricingSlug: "sellers",
    title: "Sellers",
    navTitle: "Sellers",
    who: "Retail, wholesale, spare parts, hardware, agro-dealers, distributors",
    eyebrow: "For businesses whose money is sitting on the shelf",
    headline: "Know what you have, what it cost, and what it made you.",
    summary:
      "Corelith ties the till to the stockroom to the ledger, so a sale reduces inventory, books the margin and shows up on the branch report the same minute it happens.",
    audience:
      "Hardware stores, spare-parts counters, wholesalers, distributors, agro-dealers, pharmacies and multi-branch retailers carrying enough stock that shrinkage hurts.",
    cta: "See the seller setup",
    whatsapp:
      "Hi Corelith, I run a retail, wholesale or distribution business and would like to see the seller setup.",
    icon: Storefront,
    deliverStep: {
      label: "Pick and hand over",
      copy: "Stock leaves the shelf against the order, and the on-hand figure, the cost of sale and the margin all move together.",
    },
    workflow: ["Order", "Check stock", "Pick and issue", "Invoice", "Payment", "Reorder"],
    landingPains: [
      "You find out about a stock-out from the customer, not the system.",
      "Nobody can tell you today's margin without a spreadsheet and an evening.",
      "Branch cash-ups arrive on Monday for money that moved on Thursday.",
    ],
    landingProof: { value: "1 minute", label: "From till to margin report" },
    seo: {
      title: "Retail, wholesale and distribution software in Zimbabwe",
      description:
        "Corelith connects POS, stock, purchasing, invoicing, customer accounts, branch control and ZIMRA-ready reporting for Zimbabwean sellers and distributors.",
      path: "/home/solutions/sellers",
      keywords: [
        "retail software Zimbabwe",
        "wholesale software Zimbabwe",
        "spare parts software Zimbabwe",
        "stock control software Zimbabwe",
        "POS inventory accounting Zimbabwe",
      ],
    },
    productVisual: {
      eyebrow: "Seller control view",
      title: "Stock, sales and branches in one operating view",
      status: "Running",
      metrics: [
        { label: "Today's sales", value: "$ 2,840.00", detail: "Across 3 branches" },
        { label: "Low-stock lines", value: "18", detail: "6 need ordering today" },
        { label: "Unpaid invoices", value: "$ 1,240.00", detail: "Due this week" },
      ],
      primaryRows: [
        { label: "Avondale branch", value: "$ 940.00", meta: "Cash-up ready" },
        { label: "Bulawayo branch", value: "$ 1,120.00", meta: "2 stock alerts" },
        { label: "Warehouse", value: "43 transfers", meta: "5 awaiting receipt" },
      ],
      secondaryRows: [
        { label: "Fiscal receipt queue", value: "Completed", tone: "success" },
        { label: "Brake pads reorder", value: "Needs input", tone: "warn" },
        { label: "Weekly margin report", value: "Running", tone: "neutral" },
      ],
    },
    pains: [
      "Sales, receiving, transfers and supplier notes never reconcile without someone re-keying them.",
      "Stock losses only become visible after the cash is already gone.",
      "The POS, the invoice book and the accounts each hold a different version of the same day.",
      "Comparing two branches means waiting for two spreadsheets from two people.",
    ],
    capabilities: [
      {
        title: "Point of sale and cash-up",
        copy: "Shifts, tenders, held carts, returns, customer accounts and a cash-up that balances before anyone goes home.",
        icon: ReceiptLong,
      },
      {
        title: "Stock and purchasing",
        copy: "Products, suppliers, purchase orders, receiving, transfers, stock counts and reorder points that fire on their own.",
        icon: Package,
      },
      {
        title: "Invoicing and receivables",
        copy: "Quotes, invoices, part-payments, customer statements, ageing and exports your accountant will accept.",
        icon: Wallet,
      },
      {
        title: "Branch control",
        copy: "Sales, stock cover, cash-up status and margin per branch, side by side, without asking anyone for a file.",
        icon: BarChart3,
      },
    ],
    outcomes: [
      "Stock on the system matches stock on the shelf",
      "Cash-up closes the same day it happens",
      "Purchasing decisions come off live cover, not memory",
      "Fiscalised receipts and clean records for ZIMRA",
    ],
    proofMetrics: [
      { value: "14 days", label: "Typical go-live for a single-branch seller" },
      { value: "1 view", label: "Sales, stock, purchasing and receivables together" },
      { value: "3–30 staff", label: "Where this setup fits best today" },
    ],
    modules: ["Core platform", "Sell", "Stock", "Books", "Retail pack"],
  },
  {
    slug: "service-providers",
    legacySlugs: [],
    pricingSlug: "service-providers",
    title: "Service providers",
    navTitle: "Service providers",
    who: "Cleaning, security, IT, logistics, plant hire, contractors, consultancies",
    eyebrow: "For businesses that sell people, hours and equipment",
    headline: "Bill every hour you worked, not every hour you remembered.",
    summary:
      "Corelith turns contracts, schedules and site visits into records that invoice themselves, so recurring work stops leaking between the roster and the invoice book.",
    audience:
      "Cleaning and security companies, IT and facilities providers, transporters, plant hire, contractors and consultancies running recurring work across client sites.",
    cta: "See the service setup",
    whatsapp:
      "Hi Corelith, I run a service business and would like to see the service provider setup.",
    icon: Work,
    deliverStep: {
      label: "Schedule and complete",
      copy: "Work is assigned to a person, a site and a date. Completion is captured on the phone that did the work.",
    },
    workflow: ["Enquiry", "Quote", "Contract", "Schedule work", "Confirm completion", "Invoice"],
    landingPains: [
      "Recurring invoices are rebuilt by hand every single month.",
      "Work gets done on site and never makes it onto a bill.",
      "Nobody can prove attendance when a client disputes the month.",
    ],
    landingProof: { value: "0 rebuilds", label: "Recurring invoices raise themselves" },
    seo: {
      title: "Service business software in Zimbabwe",
      description:
        "Corelith helps cleaning, security, IT, logistics, plant hire and contracting businesses manage contracts, schedules, site work, timesheets and recurring invoicing.",
      path: "/home/solutions/service-providers",
      keywords: [
        "service business software Zimbabwe",
        "contract management software Zimbabwe",
        "field service software Zimbabwe",
        "recurring invoicing software Zimbabwe",
        "security company software Zimbabwe",
      ],
    },
    productVisual: {
      eyebrow: "Service operations view",
      title: "Contracts, rosters and billing on one board",
      status: "Running",
      metrics: [
        { label: "Active contracts", value: "37", detail: "9 renew this quarter" },
        { label: "Visits this week", value: "184", detail: "12 unconfirmed" },
        { label: "Unbilled work", value: "$ 3,610.00", detail: "Ready to invoice" },
      ],
      primaryRows: [
        { label: "Msasa Park site", value: "18 visits", meta: "Confirmed by supervisor" },
        { label: "Borrowdale contract", value: "Renewal due", meta: "Quote drafted" },
        { label: "Callout — server room", value: "$ 180.00", meta: "Awaiting client sign-off" },
      ],
      secondaryRows: [
        { label: "Monthly billing run", value: "Running", tone: "neutral" },
        { label: "Two visits unconfirmed", value: "Needs input", tone: "warn" },
        { label: "Timesheets approved", value: "Completed", tone: "success" },
      ],
    },
    pains: [
      "Contract terms live in a signed PDF, so billing depends on someone remembering the rate.",
      "Work happens across client sites and only some of it reaches the invoice.",
      "Rosters, timesheets and payroll are three separate exercises on the same facts.",
      "Renewals arrive as a surprise instead of a pipeline.",
    ],
    capabilities: [
      {
        title: "Contracts and renewals",
        copy: "Clients, sites, rates, scope, start and end dates, with renewals surfacing before they lapse.",
        icon: FileText,
      },
      {
        title: "Scheduling and dispatch",
        copy: "Assign people and equipment to sites and dates, and confirm completion from a phone in the field.",
        icon: Calendar,
      },
      {
        title: "Time and attendance",
        copy: "Who was on site, for how long, approved by whom — the evidence behind the invoice and the payroll run.",
        icon: Users,
      },
      {
        title: "Recurring invoicing",
        copy: "A billing run that reads the contract and the work actually done, then posts straight into the books.",
        icon: ReceiptLong,
      },
    ],
    outcomes: [
      "Every completed visit reaches an invoice",
      "Monthly billing takes an hour instead of a week",
      "Client disputes are answered with records, not arguments",
      "Renewals get worked before they expire",
    ],
    proofMetrics: [
      { value: "1 record", label: "Contract, roster, timesheet and invoice" },
      { value: "Per site", label: "Billing that follows how you actually sell" },
      { value: "Offline", label: "Site confirmation works without signal" },
    ],
    modules: ["Core platform", "Sell", "Work", "Books", "People", "CRM pack"],
  },
  {
    slug: "workshops",
    legacySlugs: ["workshops-auto", "automotive"],
    pricingSlug: "workshops",
    title: "Workshops",
    navTitle: "Workshops",
    who: "Garages, panel beaters, fitment centres, equipment repair, dealer service bays",
    eyebrow: "For businesses that fix things for a living",
    headline: "Every part on the job card. Every hour on the invoice.",
    summary:
      "Corelith runs the job from estimate to approval to parts issue to final invoice, so labour and parts stop disappearing between the bay and the front desk.",
    audience:
      "Service garages, panel beaters, fitment centres, plant and equipment repairers, dealership service bays and parts-and-service operators.",
    cta: "See the workshop setup",
    whatsapp:
      "Hi Corelith, I run a workshop and would like to see the workshop setup.",
    icon: Wrench,
    deliverStep: {
      label: "Open the job card",
      copy: "Labour hours and issued parts book against the job as they happen, so the invoice writes itself from the work.",
    },
    workflow: ["Booking", "Estimate", "Approval", "Job card", "Parts and labour", "Invoice"],
    landingPains: [
      "Parts walk out of the store and never reach a job card.",
      "The customer approved a price on WhatsApp that nobody can find.",
      "You cannot say which jobs are stuck without walking the floor.",
    ],
    landingProof: { value: "Every part", label: "Issued against a job, or not at all" },
    seo: {
      title: "Workshop and garage management software in Zimbabwe",
      description:
        "Corelith gives workshops, garages, panel beaters and service bays job cards, estimates, approvals, parts issue, labour costing, service history and invoicing.",
      path: "/home/solutions/workshops",
      keywords: [
        "workshop management software Zimbabwe",
        "garage job card software",
        "vehicle service software Zimbabwe",
        "panel beater software Zimbabwe",
        "parts and labour costing software",
      ],
    },
    productVisual: {
      eyebrow: "Workshop floor view",
      title: "Jobs, parts and approvals on one board",
      status: "Running",
      metrics: [
        { label: "Jobs in the bay", value: "9", detail: "3 awaiting approval" },
        { label: "Parts on jobs", value: "$ 740.00", detail: "Reserved, not yet billed" },
        { label: "Ready to invoice", value: "4", detail: "Work signed off" },
      ],
      primaryRows: [
        { label: "JC-1042 — Hilux service", value: "Needs input", meta: "Customer approval pending" },
        { label: "JC-1039 — Gearbox rebuild", value: "Running", meta: "Technician: T. Moyo" },
        { label: "Brake kit", value: "Completed", meta: "Issued to JC-1042" },
      ],
      secondaryRows: [
        { label: "Service history synced", value: "Completed", tone: "success" },
        { label: "Deposit outstanding", value: "Needs input", tone: "warn" },
        { label: "Bay allocation", value: "Running", tone: "neutral" },
      ],
    },
    pains: [
      "Parts leave the store on a promise and are never costed to the job.",
      "Estimates and approvals happen in chats, then cannot be produced when the customer argues.",
      "Labour is guessed at invoice time because nobody logged the hours.",
      "Service history sits in a book, so repeat customers get treated like strangers.",
    ],
    capabilities: [
      {
        title: "Estimates and approvals",
        copy: "Quote the job, send it, capture the customer's approval, and keep it attached to the record for good.",
        icon: ClipboardList,
      },
      {
        title: "Job cards",
        copy: "Bookings, bay and technician allocation, labour hours, status, checks and sign-off.",
        icon: Wrench,
      },
      {
        title: "Parts and costing",
        copy: "Parts stock, issue against a job, purchasing for backorders, and true cost against every invoice line.",
        icon: Package,
      },
      {
        title: "Customer and asset history",
        copy: "Every vehicle or machine keeps its own file: work done, parts fitted, what it cost, what is due next.",
        icon: History,
      },
    ],
    outcomes: [
      "Parts leakage becomes visible and then stops",
      "Approvals are on the record before work starts",
      "Invoices match the work that was actually done",
      "Service history brings customers back",
    ],
    proofMetrics: [
      { value: "1 job card", label: "Labour, parts, approval and invoice" },
      { value: "6 steps", label: "Booking to invoice, ready before the demo" },
      { value: "Per bay", label: "Live status without walking the floor" },
    ],
    modules: ["Core platform", "Sell", "Stock", "Work", "Books", "Workshop pack"],
  },
  {
    slug: "manufacturers",
    legacySlugs: [],
    pricingSlug: "manufacturers",
    title: "Manufacturers",
    navTitle: "Manufacturers",
    who: "Food processing, fabrication, packaging, furniture, chemicals, light assembly",
    eyebrow: "For businesses that turn raw materials into orders",
    headline: "Know what a unit costs you before you agree the price.",
    summary:
      "Corelith follows raw material into production and finished goods out to customers, so yield, wastage and true unit cost stop being an argument at month end.",
    audience:
      "Food and beverage processors, fabricators, packaging and printing works, furniture makers, chemical blenders and light assembly operations.",
    cta: "See the production setup",
    whatsapp:
      "Hi Corelith, I run a manufacturing or production business and would like to see the production setup.",
    icon: Factory,
    deliverStep: {
      label: "Make the batch",
      copy: "Raw material is consumed, output is booked, and the cost of the run lands on the finished goods it produced.",
    },
    workflow: ["Order", "Plan the run", "Issue materials", "Produce", "Book output", "Dispatch and invoice"],
    landingPains: [
      "Unit cost is a guess, so quoting is a gamble on your own margin.",
      "Wastage and yield are only visible after stock-take.",
      "Machine downtime is discussed but never actually recorded.",
    ],
    landingProof: { value: "Per batch", label: "Real cost, yield and wastage" },
    seo: {
      title: "Manufacturing and production software in Zimbabwe",
      description:
        "Corelith tracks raw materials, production runs, yield, wastage, finished goods, unit cost, maintenance and dispatch for Zimbabwean manufacturers.",
      path: "/home/solutions/manufacturers",
      keywords: [
        "manufacturing software Zimbabwe",
        "production management software Zimbabwe",
        "raw material tracking software",
        "unit cost software Zimbabwe",
        "food processing software Zimbabwe",
      ],
    },
    productVisual: {
      eyebrow: "Production view",
      title: "Runs, materials and yield in one place",
      status: "Running",
      metrics: [
        { label: "Runs in progress", value: "4", detail: "2 finish today" },
        { label: "Yield this week", value: "94.2%", detail: "Target 93%" },
        { label: "Finished goods", value: "$ 18,400.00", detail: "Valued at cost" },
      ],
      primaryRows: [
        { label: "Batch RUN-0318", value: "Running", meta: "1,200 units, line 2" },
        { label: "Maize meal — 10kg", value: "Completed", meta: "Yield 95.1%" },
        { label: "Packaging film", value: "Needs input", meta: "Below reorder point" },
      ],
      secondaryRows: [
        { label: "Line 2 service due", value: "Needs input", tone: "warn" },
        { label: "Material issue posted", value: "Completed", tone: "success" },
        { label: "Dispatch schedule", value: "Running", tone: "neutral" },
      ],
    },
    pains: [
      "Nobody can produce a defensible cost per unit, so pricing is set by feel.",
      "Raw material issues are recorded on paper and reconciled long after the run.",
      "Yield and wastage only appear at stock-take, when it is far too late to act.",
      "Breakdowns and planned maintenance are not attached to the output they cost you.",
    ],
    capabilities: [
      {
        title: "Materials and receiving",
        copy: "Raw material stock, suppliers, purchase orders, receiving and reorder points across every store.",
        icon: Warehouse,
      },
      {
        title: "Production runs",
        copy: "Plan a run, issue materials against it, book output and wastage, and close it with a real cost.",
        icon: Factory,
      },
      {
        title: "Cost and yield",
        copy: "Cost per unit, yield per run and wastage by line — the numbers that decide whether an order is worth taking.",
        icon: ChartLine,
      },
      {
        title: "Plant and maintenance",
        copy: "Equipment register, planned maintenance, breakdowns and downtime tied to the output they interrupted.",
        icon: Wrench,
      },
    ],
    outcomes: [
      "A unit cost you can quote against with confidence",
      "Wastage caught during the run, not at stock-take",
      "Raw material cover visible before the line stops",
      "Downtime measured against what it actually cost",
    ],
    proofMetrics: [
      { value: "Per run", label: "Materials in, output and wastage out" },
      { value: "Live cost", label: "Costing that updates as the run does" },
      { value: "Multi-store", label: "Raw, WIP and finished goods held apart" },
    ],
    modules: ["Core platform", "Stock", "Work", "Books", "Maintenance pack"],
  },
  {
    slug: "sales-teams",
    legacySlugs: [],
    pricingSlug: "sales-teams",
    title: "Sales teams",
    navTitle: "Sales teams",
    who: "Field sales, distributor reps, B2B account teams, dealership sales floors",
    eyebrow: "For the people who start the loop",
    headline: "A pipeline your reps actually update, because it pays them.",
    summary:
      "Corelith puts leads, quotes, follow-ups and commission on the same rail as stock and invoicing, so a won deal becomes an order without anyone re-typing it.",
    audience:
      "Field sales teams, distributor and agency reps, B2B account managers, dealership sales floors and any team carrying a target against real stock.",
    cta: "See the sales setup",
    whatsapp:
      "Hi Corelith, I run a sales team and would like to see the sales team setup.",
    icon: Megaphone,
    deliverStep: {
      label: "Win and hand over",
      copy: "The won deal converts into an order with the stock already reserved, so nothing is re-keyed and nothing is promised twice.",
    },
    workflow: ["Lead", "Qualify", "Quote", "Follow up", "Close", "Hand to fulfilment"],
    landingPains: [
      "The pipeline is a spreadsheet that is honest once a month.",
      "Reps quote stock that was sold yesterday by someone else.",
      "Commission is argued over instead of calculated.",
    ],
    landingProof: { value: "Live stock", label: "Behind every quote a rep sends" },
    seo: {
      title: "Sales team and CRM software in Zimbabwe",
      description:
        "Corelith gives sales teams leads, pipeline, quotations off live stock, follow-up reminders, targets and commission, connected to invoicing and fulfilment.",
      path: "/home/solutions/sales-teams",
      keywords: [
        "sales CRM Zimbabwe",
        "pipeline software Zimbabwe",
        "quotation software Zimbabwe",
        "field sales app Zimbabwe",
        "commission tracking software",
      ],
    },
    productVisual: {
      eyebrow: "Sales view",
      title: "Pipeline, quotes and follow-ups by rep",
      status: "Running",
      metrics: [
        { label: "Open pipeline", value: "$ 46,200.00", detail: "31 live deals" },
        { label: "Quotes out", value: "18", detail: "6 expire this week" },
        { label: "Closed this month", value: "$ 12,900.00", detail: "72% of target" },
      ],
      primaryRows: [
        { label: "Chikwanha Hardware", value: "$ 8,400.00", meta: "Quote sent, follow up Friday" },
        { label: "Ruwa Distributors", value: "Won", meta: "Converted to order SO-2210" },
        { label: "T. Moyo — Q3 target", value: "72%", meta: "Ahead of pace" },
      ],
      secondaryRows: [
        { label: "6 follow-ups due today", value: "Needs input", tone: "warn" },
        { label: "Commission run", value: "Running", tone: "neutral" },
        { label: "Quote-to-order sync", value: "Completed", tone: "success" },
      ],
    },
    pains: [
      "Leads live in personal phones, so a rep leaving takes the pipeline with them.",
      "Quotes go out against stock that is already committed elsewhere.",
      "Follow-ups depend on memory, and the ones that slip are the ones worth money.",
      "Targets and commission are reconstructed at month end and disputed every time.",
    ],
    capabilities: [
      {
        title: "Leads and pipeline",
        copy: "Every enquiry captured with an owner, a value, a stage and a next action that is actually dated.",
        icon: TrendingUp,
      },
      {
        title: "Quotes off live stock",
        copy: "Price from real availability and real cost, send the document, and convert the accepted quote into an order.",
        icon: FileText,
      },
      {
        title: "Follow-up discipline",
        copy: "Reminders, call logs and ageing deals surfaced daily so nothing worth money goes quiet.",
        icon: Calendar,
      },
      {
        title: "Targets and commission",
        copy: "Targets per rep, live attainment, and commission calculated from invoices that were actually paid.",
        icon: Payments,
      },
    ],
    outcomes: [
      "A pipeline that survives a rep resigning",
      "Quotes that never oversell available stock",
      "Follow-ups that happen on the day they are due",
      "Commission calculated once, from paid invoices",
    ],
    proofMetrics: [
      { value: "Lead to cash", label: "One rail, no re-keying at handover" },
      { value: "Per rep", label: "Pipeline, attainment and commission" },
      { value: "On a phone", label: "Built for reps who are not at a desk" },
    ],
    modules: ["Core platform", "Sell", "Stock", "Books", "CRM pack"],
  },
];

export const primarySegment = segments[0];

/** Kept as an alias so existing imports and the sitemap keep resolving. */
export const solutions = segments;
export type MarketingSolution = MarketingSegment;

export function getSegmentBySlug(slug: string) {
  return segments.find((segment) => segment.slug === slug) ?? null;
}

export function getSegmentByAnySlug(slug: string) {
  return (
    segments.find(
      (segment) => segment.slug === slug || segment.legacySlugs.includes(slug),
    ) ?? null
  );
}

export function getCanonicalSegmentSlug(slug: string) {
  return getSegmentByAnySlug(slug)?.slug ?? null;
}

export const getSolutionBySlug = getSegmentBySlug;
export const getSolutionByAnySlug = getSegmentByAnySlug;
export const getCanonicalSolutionSlug = getCanonicalSegmentSlug;

// ---------------------------------------------------------------------------
// Schools — a separate track, not a segment
// ---------------------------------------------------------------------------

/**
 * Schools sit outside `segments` on purpose. They do not run order-to-cash,
 * they buy per term against enrolment, and the decision goes through a board
 * rather than an owner. Mixing them into the main funnel weakens both stories.
 */
export const schoolsTrack = {
  eyebrow: "A separate track for schools",
  headline: "One system for admissions, fees, academics and parents.",
  summary:
    "Corelith Schools connects the registrar, the bursar, the staff room and the parent on one record — priced per term against enrolment, and rolled out with the leadership team rather than sold over a checkout page.",
  audience:
    "Private and mission schools, boarding schools, multi-campus groups, colleges and training institutions.",
  cta: "See schools and pricing",
  whatsapp:
    "Hi Corelith, I am from a school and would like to talk about Corelith Schools.",
  icon: Building2,
  workflow: ["Application", "Admission", "Fee schedule", "Payment", "Academics", "Parent portal"],
  pains: [
    "Admissions, student records, fees and academics each live in a different department's file.",
    "Parents phone the bursar for a balance that should be on their own screen.",
    "Leadership cannot see finance, attendance and academics in one place before a board meeting.",
    "Procurement and committees need a rollout plan, not a free trial link.",
  ],
  capabilities: [
    {
      title: "Admissions and student records",
      copy: "Applications, offers, enrolment, guardians, classes, documents and the full student file in one place.",
      icon: ClipboardList,
    },
    {
      title: "Fees and finance",
      copy: "Fee structures, bulk invoicing, receipts, arrears, waivers, statements and a bursar's report that reconciles.",
      icon: Payments,
    },
    {
      title: "Academics",
      copy: "Attendance registers, subjects, teachers, marks entry, moderation windows and published report cards.",
      icon: FileText,
    },
    {
      title: "Boarding and welfare",
      copy: "Hostels, beds, leave, sanatorium and the day-to-day records a boarding school has to keep.",
      icon: Building2,
    },
    {
      title: "Portals",
      copy: "Parent, student, teacher and staff access, each seeing exactly what their role should see.",
      icon: Users,
    },
    {
      title: "Leadership reporting",
      copy: "Enrolment, collections, arrears, attendance and results in the shape a board actually asks for.",
      icon: BarChart3,
    },
  ],
  outcomes: [
    "One student record instead of four departmental copies",
    "Fee collection and arrears visible daily, not at term end",
    "Parents self-serve balances, statements and results",
    "A rollout plan the board can approve",
  ],
  faqs: [
    {
      q: "Why are schools priced per term?",
      a: "Because that is how a school budgets. Fees come in per term, so the software cost sits in the same cycle instead of arriving as a monthly debit against an account that only fills three times a year.",
    },
    {
      q: "Can you migrate our current student and fee records?",
      a: "Yes. Data migration is a scoped item on the schools track — we import students, guardians, classes, fee structures and outstanding balances so you open the new term with correct opening figures.",
    },
    {
      q: "Do parents need to install anything?",
      a: "No. The parent portal runs in a browser on any phone, and balances, statements and results are available without calling the bursar.",
    },
    {
      q: "What about multi-campus groups?",
      a: "The Group band consolidates campuses under one set of books and one reporting line while each campus keeps its own registers, fee structures and staff.",
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// Platform modules
// ---------------------------------------------------------------------------

export const coreModules = [
  {
    name: "Sell",
    icon: ReceiptLong,
    copy:
      "Leads, quotations, orders, point of sale, invoices, receipts, customer accounts and statements.",
    connection:
      "A sale writes to the customer record, reduces stock, books the margin and posts to the ledger in one action.",
    highlights: ["Quotes and orders", "Point of sale", "Invoices and receipts", "Customer statements"],
  },
  {
    name: "Stock",
    icon: Package,
    copy:
      "Products, suppliers, purchase orders, receiving, warehouses, transfers, counts and reorder points.",
    connection:
      "Receiving updates on-hand quantities, average cost and the reorder signals purchasing works from.",
    highlights: ["Multi-store inventory", "Purchase orders", "Transfers and counts", "Reorder alerts"],
  },
  {
    name: "Work",
    icon: Wrench,
    copy:
      "Job cards, production runs, scheduled service visits, equipment, maintenance and completion sign-off.",
    connection:
      "Whatever you deliver — a job, a batch or a site visit — consumes stock and labour against one costed record.",
    highlights: ["Job cards", "Production runs", "Scheduling", "Maintenance"],
  },
  {
    name: "Books",
    icon: FileText,
    copy:
      "Cash and bank, receivables, payables, expenses, VAT, fixed assets, multi-currency and financial statements.",
    connection:
      "Sales and purchases post themselves, so the trial balance is a report rather than a reconstruction.",
    highlights: ["Receivables and payables", "Banking", "VAT and fiscalisation", "Financial statements"],
  },
  {
    name: "People",
    icon: Users,
    copy:
      "Staff records, roles and permissions, attendance, approvals, payroll and per-user accountability.",
    connection:
      "Every record carries who created, approved or changed it, so accountability does not depend on trust alone.",
    highlights: ["Roles and permissions", "Attendance", "Approvals", "Payroll"],
  },
];

export const platformCapabilities = [
  {
    title: "Works offline",
    copy: "Sales, stock moves and attendance keep working through load-shedding and dead links, then sync when the connection returns.",
    icon: WifiOff,
  },
  {
    title: "Built for phones",
    copy: "The people doing the work are on a phone in a yard, a bay or a client site — not at a desk. Every daily screen is built for that.",
    icon: Storefront,
  },
  {
    title: "ZIMRA fiscalisation",
    copy: "Fiscal receipts and the FDMS integration are part of the product, not a third-party connector you have to maintain.",
    icon: ShieldCheck,
  },
  {
    title: "Multi-site and multi-currency",
    copy: "Branches, warehouses and campuses roll up into one set of books, in USD and ZWG, without a separate consolidation exercise.",
    icon: ArrowRightLeft,
  },
  {
    title: "Roles that hold",
    copy: "Approval limits, permission sets and an audit trail on every record, so control does not rest on one trusted person.",
    icon: ShieldCheck,
  },
  {
    title: "Reports on demand",
    copy: "Margin, ageing, stock cover, yield and branch performance are pages you open, not files somebody has to build.",
    icon: BarChart3,
  },
];

export const launchSprintSteps = [
  {
    title: "Workflow diagnosis",
    copy: "We map how orders, stock, jobs, invoices, payments and approvals move through your business today.",
    icon: ClipboardList,
  },
  {
    title: "Configuration",
    copy: "The core platform, your industry pack, branches, roles and the first reports get set up around that map.",
    icon: Dashboard,
  },
  {
    title: "Data import",
    copy: "Products, customers, suppliers, opening balances and opening stock loaded within an agreed scope.",
    icon: ArrowRightLeft,
  },
  {
    title: "Team training",
    copy: "The people who sell, receive, approve, work the jobs and read the reports are trained on their own data.",
    icon: Users,
  },
  {
    title: "Go live",
    copy: "First invoices, first receipts, first job cards, first close of shift — with us on the line while it happens.",
    icon: CheckCircle,
  },
  {
    title: "Support and improve",
    copy: "WhatsApp follow-up, adoption checks and a review of the first month's numbers against what we agreed.",
    icon: LifeBuoy,
  },
];

export const pricingPrinciples = [
  "The plan covers sites and capacity, never headcount.",
  "Add every cashier, clerk, rep and technician you need up to your seat ceiling.",
  "Onboarding is quoted separately because migration and training are real work.",
  "Start with the one pack that fixes this month's problem.",
  "Add branches, payroll, portals and finance depth when they pay for themselves.",
  "Schools stay on their own per-term path.",
];

export const proofFrames = [
  {
    title: "Stock accuracy",
    metric: "System matches shelf",
    copy: "The measure is the gap between what the system says you hold and what a count actually finds. We agree the starting number before go-live and re-measure after.",
    icon: PackageCheck,
  },
  {
    title: "Time to a real number",
    metric: "Days to minutes",
    copy: "How long it takes to answer 'what did we make this week'. If that is still a spreadsheet exercise after rollout, the rollout did not work.",
    icon: BarChart3,
  },
  {
    title: "Revenue that reaches an invoice",
    metric: "Nothing unbilled",
    copy: "Work completed, parts issued and stock delivered that never reached a bill. This is usually where the software pays for itself first.",
    icon: Coins,
  },
];

export const launchTargets = [
  { value: "Harare first", label: "The largest concentration of operating businesses" },
  { value: "Bulawayo next", label: "Strong trade base and a higher formal share" },
  { value: "10 founding customers", label: "Across selling, service, workshop and production" },
];

export const contactChannels = [
  {
    title: "WhatsApp sales",
    value: WHATSAPP_DISPLAY,
    icon: ClipboardList,
    copy: "The fastest way to a practical conversation, a demo slot or a rollout question.",
    href: whatsappHref("Hi Corelith, I would like help finding the right setup."),
    external: true,
  },
  {
    title: "Email",
    value: "hello@pagka.dev",
    icon: Mail,
    copy: "Best for proposals, procurement, partnerships and longer implementation detail.",
    href: "mailto:hello@pagka.dev",
    external: false,
  },
  {
    title: "Tailored demo",
    value: "Setup questionnaire",
    icon: Calendar,
    copy: "Answer the setup questions first so the demo opens on your workflow, not a blank account.",
    href: "/home/book-demo",
    external: false,
  },
];

export const foundingPartnerItems = [
  "Selected businesses only, across selling, service, workshop and production",
  "Discounted, scoped onboarding",
  "Your rate held for the first 12 months",
  "Workflow mapping directly with the product team",
  "Data migration within a defined scope",
  "Structured feedback sessions that shape the roadmap",
  "Success targets agreed in writing before go-live",
  "Case-study participation only after results, and only with your permission",
];

export const faqs = [
  {
    q: "Who is Corelith actually for?",
    a: "Businesses that take an order, deliver it and invoice for it — sellers, service providers, workshops, manufacturers and sales teams. If you carry stock, run jobs, or bill customers on account, the loop is the same and Corelith runs it.",
  },
  {
    q: "Do you charge per user?",
    a: "No. Plans are priced per site with a generous seat ceiling. Adding a cashier, a clerk or a technician costs nothing until you pass that ceiling, which is the opposite of how the per-seat suites bill you.",
  },
  {
    q: "Is this an ERP?",
    a: "It covers the same ground, but it does not arrive empty. Your industry's workflow is configured before the demo, so you are not paying a consultant to discover whether the software can match your business.",
  },
  {
    q: "Does it work when the internet is down?",
    a: "Yes. Sales, stock movements and attendance capture keep working offline and sync as soon as the connection returns. Load-shedding does not stop the shop.",
  },
  {
    q: "Do you handle ZIMRA fiscalisation?",
    a: "Yes, the FDMS integration is built into the product. Fiscal receipts are issued from the same sale that moves your stock and posts to your books.",
  },
  {
    q: "Can you import our existing data?",
    a: "Yes. Products, customers, suppliers, opening balances and opening stock are loaded during the Launch Sprint within a scope we agree with you first.",
  },
  {
    q: "Why is there a setup fee?",
    a: "Because migration, configuration, training and go-live support are real work done by real people. Hiding that cost inside the subscription would either inflate your monthly price or guarantee a bad rollout.",
  },
  {
    q: "Do you offer a free trial?",
    a: "A blank account proves very little for software like this. The path that works is a tailored demo built on your own workflow, then a scoped Launch Sprint with agreed success targets.",
  },
  {
    q: "How are schools different?",
    a: "Schools do not run order-to-cash and do not buy monthly. They are priced per term against enrolment and rolled out with the leadership team, which is why they have their own page and their own pricing.",
  },
  {
    q: "Why is WhatsApp everywhere on this site?",
    a: "Because that is where Zimbabwean business actually happens. We use it for sales conversations, document collection, demo reminders and support follow-up, and the product is built knowing your customers use it too.",
  },
];

export const setupQuestions = [
  "Business name",
  "Contact person",
  "Work email",
  "Phone",
  "City",
  "Business type",
  "Locations",
  "People using the system",
  "Current tools",
  "Biggest operational problem",
  "Timeline",
  "Preferred channel",
];

export const companyPrinciples = [
  {
    title: "The rollout is part of the product",
    copy:
      "The job is not finished when a login is created. It is finished when your team is using the system on a normal Tuesday without being reminded to.",
    icon: LifeBuoy,
  },
  {
    title: "Industry readiness beats feature count",
    copy:
      "A long feature list is easy to write and hard to use. What matters is whether the workflow on screen matches the one in your yard.",
    icon: Factory,
  },
  {
    title: "Start with one problem",
    copy:
      "Turn on the module that is costing you money this month. Add branches, payroll, portals and finance depth when the value is obvious.",
    icon: TrendingUp,
  },
  {
    title: "Local reality is a design constraint",
    copy:
      "Load-shedding, patchy data, USD and ZWG side by side, WhatsApp-led communication and ZIMRA are not edge cases here. They are the brief.",
    icon: ShieldCheck,
  },
];
