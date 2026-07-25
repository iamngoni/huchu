import {
  ArrowRightLeft,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  Dashboard,
  DirectionsCar,
  Factory,
  FileText,
  LifeBuoy,
  Mail,
  Package,
  PackageCheck,
  Payments,
  ReceiptLong,
  ShieldCheck,
  Storefront,
  TrendingUp,
  Users,
  Wallet,
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

export type MarketingSolution = {
  slug: string;
  legacySlugs: string[];
  pricingSlug: string;
  title: string;
  navTitle: string;
  eyebrow: string;
  headline: string;
  summary: string;
  audience: string;
  cta: string;
  whatsapp: string;
  icon: LucideIcon;
  strategicRole: string;
  seo: SeoEntry;
  productVisual: ProductVisual;
  pains: string[];
  workflow: string[];
  capabilities: Array<{ title: string; copy: string; icon: LucideIcon }>;
  outcomes: string[];
  proofMetrics: Array<{ value: string; label: string }>;
  modules: string[];
};

export const navItems = [
  { label: "Platform", href: "/home/products" },
  { label: "Solutions", href: "/home/solutions" },
  { label: "Pricing", href: "/home/pricing" },
  { label: "Implementation", href: "/home/implementation-support" },
  { label: "Company", href: "/home/about" },
];

export const footerGroups = [
  {
    title: "Platform",
    links: [
      { label: "Overview", href: "/home/products" },
      { label: "Pricing", href: "/home/pricing" },
      { label: "Implementation", href: "/home/implementation-support" },
      { label: "FAQ", href: "/home/faq" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Commerce", href: "/home/solutions/commerce" },
      { label: "Workshops and auto", href: "/home/solutions/workshops-auto" },
      { label: "Schools", href: "/home/solutions/schools" },
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

export const seoPages = {
  home: {
    title: "Business software for formalising trade companies in Zimbabwe",
    description:
      "Corelith connects sales, stock, invoices, customers, finance and teams for Zimbabwean retailers, wholesalers, spare-parts sellers and growing trade businesses.",
    path: "/home",
    keywords: [
      "business software Zimbabwe",
      "stock control software Zimbabwe",
      "POS inventory system Zimbabwe",
      "retail software Zimbabwe",
      "wholesale management software",
      "ZIMRA ready business software",
    ],
  },
  root: {
    title: "Business software for formalising trade companies in Zimbabwe",
    description:
      "Corelith connects sales, stock, invoices, customers, finance and teams for Zimbabwean retailers, wholesalers, spare-parts sellers and growing trade businesses.",
    path: "/",
    keywords: [
      "business software Zimbabwe",
      "stock control software Zimbabwe",
      "POS inventory system Zimbabwe",
      "retail software Zimbabwe",
      "wholesale management software",
    ],
  },
  platform: {
    title: "Corelith platform",
    description:
      "See how Corelith connects Sell, Stock, Books and People on one business platform with commerce, workshop, automotive and schools workflows.",
    path: "/home/products",
    keywords: [
      "business platform Zimbabwe",
      "inventory accounting CRM software",
      "connected business modules",
      "Corelith Sell Stock Books People",
    ],
  },
  solutions: {
    title: "Corelith solutions",
    description:
      "Corelith is built around trade, workshop, automotive and schools workflows instead of arriving as an empty generic ERP.",
    path: "/home/solutions",
    keywords: [
      "industry business software Zimbabwe",
      "retail wholesale software",
      "workshop management software Zimbabwe",
      "school management software Zimbabwe",
    ],
  },
  pricing: {
    title: "Corelith pricing",
    description:
      "Corelith pricing starts with an accessible monthly subscription and a scoped Launch Sprint for migration, configuration, training and go-live support.",
    path: "/home/pricing",
    keywords: [
      "Corelith pricing",
      "ERP pricing Zimbabwe",
      "POS inventory pricing Zimbabwe",
      "business software setup fee",
    ],
  },
  schoolsPricing: {
    title: "Corelith schools pricing",
    description:
      "Corelith schools pricing uses a separate term-based and implementation-led path for admissions, fees, academics, portals and reporting.",
    path: "/home/pricing/schools",
    keywords: [
      "school management software pricing Zimbabwe",
      "student information system Zimbabwe",
      "school fees software",
      "parent portal Zimbabwe",
    ],
  },
  implementation: {
    title: "Implementation and support",
    description:
      "Corelith implementation covers workflow mapping, data import, configuration, training, go-live support and practical WhatsApp follow-up.",
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
      "Apply for the Corelith Founding Partner Programme for selected trade and workshop businesses ready to implement a practical operating system.",
    path: "/home/founding-partner",
    keywords: [
      "Corelith founding partner",
      "Zimbabwe retail software pilot",
      "workshop software pilot",
      "business software launch programme",
    ],
  },
  bookDemo: {
    title: "Find your Corelith setup",
    description:
      "Answer a short setup questionnaire so Corelith can prepare a tailored demo around your industry, locations, current tools and biggest operational problem.",
    path: "/home/book-demo",
    keywords: [
      "book Corelith demo",
      "business software demo Zimbabwe",
      "retail software demo",
      "workshop software demo",
    ],
  },
  about: {
    title: "About Corelith",
    description:
      "Corelith is built by Hurudza Labs in Zimbabwe for growing African businesses that need serious local implementation and connected operations.",
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
      "Talk to Corelith by WhatsApp, email or tailored demo about commerce, workshop, automotive or schools software.",
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
      "Answers about Corelith fit, pricing, implementation, migration, support, Launch Sprint and industry workflows.",
    path: "/home/faq",
    keywords: [
      "Corelith FAQ",
      "business software migration Zimbabwe",
      "Corelith implementation",
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

export const problemFragments = [
  { label: "WhatsApp", copy: "Orders, approvals and customer promises disappear into chats.", icon: Users },
  { label: "Excel", copy: "Stock, invoices and branch reports depend on one person maintaining sheets.", icon: FileText },
  { label: "Paper receipts", copy: "Cash-ups and tax records take too long to reconcile.", icon: ReceiptLong },
  { label: "Separate POS", copy: "Sales happen in one place while stock and accounting lag behind.", icon: Storefront },
  { label: "Staff memory", copy: "The real process lives in people's heads instead of the system.", icon: ClipboardList },
];

export const connectedOutcomes = [
  "One customer record",
  "One stock position",
  "One financial picture",
  "One source of truth",
];

export const solutions: MarketingSolution[] = [
  {
    slug: "commerce",
    legacySlugs: ["retail-wholesale"],
    pricingSlug: "retail-wholesale",
    title: "Commerce",
    navTitle: "Commerce",
    eyebrow: "For retail, wholesale and spare-parts sellers",
    headline: "Stop stock losses and get tax-ready sales records.",
    summary:
      "Corelith helps formalising trade businesses sell, restock, invoice, reconcile and understand branch performance from one connected system.",
    audience:
      "Hardware stores, spare-parts sellers, wholesalers, distributors, multi-branch retailers and stock-led businesses preparing for cleaner records.",
    cta: "See the commerce setup",
    whatsapp:
      "Hi Corelith, I run a retail, wholesale or spare-parts business and would like to see the commerce setup.",
    icon: Storefront,
    strategicRole: "Primary launch wedge",
    seo: {
      title: "Retail, wholesale and spare-parts software in Zimbabwe",
      description:
        "Corelith Commerce connects POS, stock, purchasing, invoices, customer accounts, branch control and tax-ready reporting for Zimbabwean trade businesses.",
      path: "/home/solutions/commerce",
      keywords: [
        "retail software Zimbabwe",
        "wholesale software Zimbabwe",
        "spare parts software Zimbabwe",
        "stock control software Zimbabwe",
        "POS inventory accounting Zimbabwe",
      ],
    },
    productVisual: {
      eyebrow: "Commerce control view",
      title: "Stock, sales and branches in one operating view",
      status: "Running",
      metrics: [
        { label: "Today sales", value: "$ 2,840.00", detail: "Across 3 branches" },
        { label: "Low-stock lines", value: "18", detail: "6 need purchasing today" },
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
      "Sales, receiving, transfers and supplier notes do not reconcile quickly enough.",
      "Stock discrepancies become visible only after money is already tied up.",
      "Tax-ready sales records are hard to produce because the POS, invoices and accounts are disconnected.",
      "Owners cannot compare branches without waiting for end-of-week spreadsheets.",
    ],
    workflow: ["Purchase", "Receive stock", "Sell", "Reduce inventory", "Post payment", "Update reports"],
    capabilities: [
      {
        title: "POS and cashier control",
        copy: "Sales, shifts, tenders, receipts, held carts, returns and customer accounts.",
        icon: ReceiptLong,
      },
      {
        title: "Stock and purchasing",
        copy: "Products, suppliers, purchase orders, receiving, transfers, counts and reorder alerts.",
        icon: Package,
      },
      {
        title: "Invoices and receivables",
        copy: "Quotations, invoices, payments, balances, customer statements and accountant-friendly exports.",
        icon: Wallet,
      },
      {
        title: "Branch visibility",
        copy: "Daily sales, low-stock lines, cash-up status and branch performance in one view.",
        icon: BarChart3,
      },
    ],
    outcomes: [
      "Cleaner stock and branch reporting",
      "Faster cash-up and invoice follow-up",
      "Better purchasing decisions before cash gets trapped in dead stock",
      "A clearer path toward fiscalisation and formal records",
    ],
    proofMetrics: [
      { value: "14 days", label: "Target go-live window for a focused commerce setup" },
      { value: "1 view", label: "Sales, stock, purchasing and receivables together" },
      { value: "3-30 staff", label: "Initial customer profile for the launch motion" },
    ],
    modules: ["Core Business Base", "Sell", "Stock", "Books", "Commerce Pack"],
  },
  {
    slug: "workshops-auto",
    legacySlugs: ["automotive"],
    pricingSlug: "automotive",
    title: "Workshops and auto",
    navTitle: "Workshops and auto",
    eyebrow: "For workshops, garages, dealerships and auto-sales teams",
    headline: "Track jobs, parts and customers without WhatsApp chaos.",
    summary:
      "Corelith connects customer follow-up, estimates, job cards, parts usage, service history, vehicle stock and invoicing for auto-related businesses.",
    audience:
      "Service workshops, garages, parts-and-service operators, used-car lots, equipment sellers and dealerships that need CRM and operations together.",
    cta: "See the workshop and auto setup",
    whatsapp:
      "Hi Corelith, I run a workshop or auto business and would like to see the workshop and auto setup.",
    icon: Wrench,
    strategicRole: "Higher-value adjacent wedge",
    seo: {
      title: "Workshop and automotive management software in Zimbabwe",
      description:
        "Corelith helps workshops, garages and auto-sales teams manage leads, estimates, job cards, parts, vehicle stock, service history and invoices.",
      path: "/home/solutions/workshops-auto",
      keywords: [
        "workshop management software Zimbabwe",
        "garage job card software",
        "automotive CRM Zimbabwe",
        "vehicle inventory software Zimbabwe",
        "auto sales software Zimbabwe",
      ],
    },
    productVisual: {
      eyebrow: "Workshop and auto view",
      title: "Leads, vehicles, job cards and parts together",
      status: "Running",
      metrics: [
        { label: "Open leads", value: "46", detail: "12 need follow-up today" },
        { label: "Active jobs", value: "9", detail: "3 awaiting approval" },
        { label: "Parts reserved", value: "$ 740.00", detail: "Linked to job cards" },
      ],
      primaryRows: [
        { label: "Hilux service", value: "Needs input", meta: "Customer approval pending" },
        { label: "Mazda Demio lead", value: "Running", meta: "Quotation sent" },
        { label: "Brake kit", value: "Completed", meta: "Issued to JC-1042" },
      ],
      secondaryRows: [
        { label: "Service history", value: "Completed", tone: "success" },
        { label: "Deposit follow-up", value: "Needs input", tone: "warn" },
        { label: "Technician allocation", value: "Running", tone: "neutral" },
      ],
    },
    pains: [
      "Lead information, vehicle stock and deal progress live in different places.",
      "Job cards, parts usage and service history are not tied back to the customer relationship.",
      "Quotes and approvals happen in WhatsApp, then get lost when the invoice is needed.",
      "Owners cannot tell which jobs are stalled, which parts were used and which customers need follow-up.",
    ],
    workflow: ["Lead", "Estimate", "Approval", "Job card", "Parts issue", "Invoice and follow-up"],
    capabilities: [
      {
        title: "CRM and follow-up",
        copy: "Leads, enquiries, reminders, quotations, deposits and customer history.",
        icon: Users,
      },
      {
        title: "Job cards",
        copy: "Bookings, technician assignment, labour, status, approvals and completion checks.",
        icon: ClipboardList,
      },
      {
        title: "Parts and costing",
        copy: "Parts stock, issues to jobs, purchasing, labour costing and final invoicing.",
        icon: Wrench,
      },
      {
        title: "Vehicle stock",
        copy: "Units, reservations, price history, documents and sales pipeline visibility.",
        icon: DirectionsCar,
      },
    ],
    outcomes: [
      "Less job-card and parts leakage",
      "Cleaner lead-to-sale visibility",
      "A better service history for repeat customers",
      "Invoices that reflect the work and parts actually used",
    ],
    proofMetrics: [
      { value: "1 record", label: "Customer, vehicle, job and invoice history" },
      { value: "6 steps", label: "Lead-to-service workflow prepared before the demo" },
      { value: "Higher ARPU", label: "More workflow depth than a basic POS sale" },
    ],
    modules: ["Core Business Base", "Sell", "Stock", "Books", "CRM Pack", "Workshop Pack"],
  },
  {
    slug: "schools",
    legacySlugs: [],
    pricingSlug: "schools",
    title: "Schools",
    navTitle: "Schools",
    eyebrow: "For private, boarding and multi-campus schools",
    headline: "One system for admissions, fees, academics and parents.",
    summary:
      "Corelith Schools is an enterprise implementation track for institutions that need administration, finance, academics and portals connected carefully.",
    audience:
      "Private schools, boarding schools, multi-campus schools, training institutions and leadership teams that need committee-ready rollout planning.",
    cta: "Arrange a school consultation",
    whatsapp:
      "Hi Corelith, I run a school and would like to arrange a Corelith Schools consultation.",
    icon: Building2,
    strategicRole: "Enterprise track",
    seo: {
      title: "School management software in Zimbabwe",
      description:
        "Corelith Schools connects admissions, fees, student records, attendance, academics, staff and parent portals through an implementation-led rollout.",
      path: "/home/solutions/schools",
      keywords: [
        "school management software Zimbabwe",
        "school fees system Zimbabwe",
        "student information system Zimbabwe",
        "parent portal Zimbabwe",
        "school ERP Zimbabwe",
      ],
    },
    productVisual: {
      eyebrow: "School operating view",
      title: "Fees, admissions and academics in one leadership view",
      status: "Running",
      metrics: [
        { label: "Fee receipts", value: "$ 8,420.00", detail: "Current term" },
        { label: "Admissions", value: "23", detail: "12 awaiting documents" },
        { label: "Attendance", value: "94%", detail: "Submitted by teachers" },
      ],
      primaryRows: [
        { label: "Grade 6 invoices", value: "Running", meta: "Bulk issue in progress" },
        { label: "Parent portal", value: "Completed", meta: "Balances visible" },
        { label: "Results window", value: "Not started", meta: "Term 2 setup" },
      ],
      secondaryRows: [
        { label: "Arrears report", value: "Needs input", tone: "warn" },
        { label: "Admissions checklist", value: "Running", tone: "neutral" },
        { label: "Attendance lock", value: "Completed", tone: "success" },
      ],
    },
    pains: [
      "Admissions, student records, fees and academics are split across departments.",
      "Parents and staff lose time because notices and balances move through too many channels.",
      "Leadership cannot get one clean view of finance, attendance and academics.",
      "Procurement and committees need a more formal rollout than ordinary SMB software.",
    ],
    workflow: ["Application", "Admission", "Fee schedule", "Payment", "Academics", "Parent portal"],
    capabilities: [
      {
        title: "Admissions and records",
        copy: "Applications, student records, guardians, classes, enrolment and document checks.",
        icon: ClipboardList,
      },
      {
        title: "Fees and finance",
        copy: "Fee structures, invoices, receipts, arrears, waivers, statements and reports.",
        icon: Payments,
      },
      {
        title: "Academics",
        copy: "Attendance, subjects, teachers, marks, report windows and result publishing.",
        icon: FileText,
      },
      {
        title: "Portals",
        copy: "Parent, student, teacher and staff access designed around school roles.",
        icon: Users,
      },
    ],
    outcomes: [
      "Less duplicate entry across departments",
      "Clearer fee and academic reporting",
      "A structured rollout for leadership and committees",
      "A parent experience that reduces repetitive admin questions",
    ],
    proofMetrics: [
      { value: "Term-based", label: "Pricing model matched to school buying cycles" },
      { value: "4 portals", label: "Parent, student, teacher and staff access paths" },
      { value: "Enterprise", label: "Scoped implementation instead of instant checkout" },
    ],
    modules: ["Core Business Base", "Books", "People", "Schools Pack", "Portals"],
  },
];

export const primarySolution = solutions[0];

export const coreModules = [
  {
    name: "Sell",
    icon: ReceiptLong,
    copy:
      "Customers, leads, quotations, POS where needed, invoices, receipts, payments and customer accounts.",
    connection:
      "A sale updates the customer record, reduces stock, records payment context and feeds financial reporting.",
  },
  {
    name: "Stock",
    icon: Package,
    copy:
      "Products, suppliers, purchasing, receiving, warehouses, transfers, stock counts and reorder controls.",
    connection:
      "Receiving stock updates inventory, supplier context and the reports owners use to decide what to buy next.",
  },
  {
    name: "Books",
    icon: FileText,
    copy:
      "Cash and bank, receivables, payables, expenses, VAT context, reconciliation workflows and financial reports.",
    connection:
      "Sales and purchasing stop being isolated events and become part of a cleaner financial picture.",
  },
  {
    name: "People",
    icon: Users,
    copy:
      "Staff records, roles, permissions, attendance, approvals, payroll paths and accountability by user.",
    connection:
      "Every action has an owner, so managers can see who sold, received, approved, counted or changed records.",
  },
];

export const launchSprintSteps = [
  {
    title: "Workflow diagnosis",
    copy: "Map how sales, stock, invoices, payments and approvals currently move through the business.",
    icon: ClipboardList,
  },
  {
    title: "Corelith setup",
    copy: "Configure the base platform, one primary industry pack, roles, branches and first reports.",
    icon: Dashboard,
  },
  {
    title: "Data import",
    copy: "Load the practical starting data: products, customers, suppliers, balances and opening stock where needed.",
    icon: ArrowRightLeft,
  },
  {
    title: "Team training",
    copy: "Train the people who sell, receive stock, approve work, reconcile payments and read reports.",
    icon: Users,
  },
  {
    title: "Go live",
    copy: "Issue first invoices, receive first stock, close first shifts and review the first weekly report.",
    icon: CheckCircle,
  },
  {
    title: "Support and improve",
    copy: "Use WhatsApp follow-up, support checks and measured feedback to improve the rollout after launch.",
    icon: LifeBuoy,
  },
];

export const pricingPrinciples = [
  "The monthly number opens the door.",
  "Setup is charged because migration, configuration and training are real work.",
  "Every customer starts with Core Business Base plus one primary pack.",
  "Extra branches, payroll, portals and advanced reporting are added when they pay for themselves.",
  "Schools stay on a separate enterprise pricing path.",
];

export const proofFrames = [
  {
    title: "Stock reconciliation",
    metric: "Days to hours",
    copy: "Proof should show how long stock reconciliation took before Corelith and what changed after rollout.",
    icon: PackageCheck,
  },
  {
    title: "Branch visibility",
    metric: "Same-day view",
    copy: "Proof should show whether management can see branch sales, stock and cash-up status without waiting for spreadsheets.",
    icon: BarChart3,
  },
  {
    title: "Formal records",
    metric: "Cleaner handoff",
    copy: "Proof should show whether invoices, VAT context, receipts and accountant handoffs became easier to produce.",
    icon: ShieldCheck,
  },
];

export const launchTargets = [
  { value: "Harare first", label: "Largest concentration of operating establishments" },
  { value: "Bulawayo next", label: "Higher formal share and strong trade base" },
  { value: "10 lighthouse customers", label: "Six trade, three workshop or auto, one distribution or light manufacturing" },
];

export const contactChannels = [
  {
    title: "WhatsApp sales",
    value: "+263 78 493 9111",
    icon: ClipboardList,
    copy: "Fastest path for a practical conversation, demo reminders and rollout follow-up.",
    href:
      "https://wa.me/263784939111?text=Hi%20Corelith%2C%20I%20would%20like%20help%20finding%20the%20right%20setup.",
    external: true,
  },
  {
    title: "Email",
    value: "hello@pagka.dev",
    icon: Mail,
    copy: "Best for proposals, procurement, partnerships and longer implementation context.",
    href: "mailto:hello@pagka.dev",
    external: false,
  },
  {
    title: "Tailored demo",
    value: "Setup questionnaire",
    icon: Calendar,
    copy: "Answer the setup questions first so the demo starts from your real workflow.",
    href: "/home/book-demo",
    external: false,
  },
];

export const foundingPartnerItems = [
  "Selected trade and workshop businesses only",
  "Discounted scoped onboarding",
  "Rate fixed for the first 12 months",
  "Direct workflow mapping with the founding product team",
  "Data migration within a defined scope",
  "Structured feedback sessions",
  "Launch Sprint success targets agreed before go-live",
  "Case-study participation only after measurable results and permission",
];

export const faqs = [
  {
    q: "Who is Corelith for?",
    a:
      "Corelith is for growing, formalising businesses with stock, customer accounts, invoices, several users, multiple locations or recurring operational workflows.",
  },
  {
    q: "Why is the site trade-led?",
    a:
      "Retail, wholesale, spare-parts and stock-led businesses have urgent pain around stock leakage, branch visibility, invoicing, receivables and compliance-ready records.",
  },
  {
    q: "Is Corelith an ERP?",
    a:
      "Corelith connects the same serious operational areas, but the public message should not be generic ERP. The product starts from industry workflows and practical implementation.",
  },
  {
    q: "Do you offer a blank trial?",
    a:
      "A blank trial is not the main offer because Corelith needs workflow setup, migration and team training to prove value. The main path is a tailored demo and scoped Launch Sprint.",
  },
  {
    q: "Do you charge setup?",
    a:
      "Yes. Setup covers real implementation work such as workflow mapping, configuration, data import, training and go-live support.",
  },
  {
    q: "Can Corelith work for schools?",
    a:
      "Yes, but schools use a separate enterprise track because admissions, fees, academics, portals, procurement and committee decisions need a different rollout and pricing model.",
  },
  {
    q: "Can you import existing data?",
    a:
      "Yes. The Launch Sprint defines which products, customers, suppliers, balances, opening stock or school records should be imported for the first go-live.",
  },
  {
    q: "Why is WhatsApp visible?",
    a:
      "Zimbabwean business communication is heavily WhatsApp-led. Corelith uses it for sales conversations, reminders, document collection and practical support follow-up.",
  },
];

export const setupQuestions = [
  "Business name",
  "Contact person",
  "Work email",
  "Phone",
  "City",
  "Industry",
  "Locations",
  "People using the system",
  "Current tools",
  "Biggest operational problem",
  "Timeline",
  "Preferred channel",
];

export const companyPrinciples = [
  {
    title: "Local implementation is part of the product",
    copy:
      "The work is not finished when a login is created. Corelith has to help teams migrate, train, go live and keep improving.",
    icon: LifeBuoy,
  },
  {
    title: "Industry readiness beats feature count",
    copy:
      "The site should show workflows, controls and reports that match the business, not a grid of unrelated software modules.",
    icon: Factory,
  },
  {
    title: "Progressive adoption protects the customer",
    copy:
      "Start with one painful workflow. Add branches, payroll, portals, deeper accounting and automation when the value is clear.",
    icon: TrendingUp,
  },
  {
    title: "Compliance is a wedge, not a footnote",
    copy:
      "Formalising businesses need cleaner invoices, receipts, VAT context, payment records and accountant handoffs.",
    icon: ShieldCheck,
  },
];

export function getSolutionBySlug(slug: string) {
  return solutions.find((solution) => solution.slug === slug) ?? null;
}

export function getSolutionByAnySlug(slug: string) {
  return (
    solutions.find(
      (solution) => solution.slug === slug || solution.legacySlugs.includes(slug),
    ) ?? null
  );
}

export function getCanonicalSolutionSlug(slug: string) {
  return getSolutionByAnySlug(slug)?.slug ?? null;
}
