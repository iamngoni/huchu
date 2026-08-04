import {
  MapPin,
  AlertCircle,
  BarChart3,
  Building2,
  CalendarCheck,
  Calendar,
  Camera,
  ChartLine,
  Checklist,
  Coins,
  Dashboard,
  Dataset,
  EventNote,
  Factory,
  FileCheck,
  FileText,
  Fuel,
  Funnel,
  History,
  Zap,
  LocalShipping,
  ManageAccounts,
  NoteAdd,
  ReceiptLong,
  ReportProblem,
  TableRows,
  Home,
  Package,
  PackageCheck,
  ShieldCheck,
  Server,
  Scale,
  Upload,
  UserRound,
  Users,
  UserCheck,
  Video,
  Wallet,
  Payments,
  Phone,
  Wrench,
  type LucideIcon,
} from "@/lib/icons";
import { HR_TABS } from "@/lib/hr/tab-config";
import { RETAIL_TABS } from "@/lib/retail/tab-config";
import { hasRole, type UserRole } from "@/lib/roles";
import { SCRAP_TABS } from "@/lib/scrap-metal/tab-config";

const HR_MODULE_ALLOWED_ROLES: UserRole[] = ["SUPERADMIN", "MANAGER", "CLERK"];

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  /**
   * Which group inside the section this belongs to. Items with no group render
   * first and unlabelled, which keeps every existing section rendering exactly
   * as it did.
   */
  group?: string;
};

/**
 * A labelled band of related items inside a section.
 *
 * Only worth it once a section is long enough that a flat list stops being
 * scannable — a sixteen-item CRM reads as inventory rather than navigation.
 * A group whose items are all gated away disappears with them.
 */
export type NavGroup = {
  id: string;
  label: string;
};

export type NavSection = {
  id: string;
  title: string;
  description?: string;
  featureKey?: string;
  /** Declares group order and labels. Groups with no visible items are dropped. */
  groups?: NavGroup[];
  /**
   * Render each group as its own root-level entry instead of as a band inside
   * this section. For a section whose title names a category rather than a
   * destination, the groups are the places people are actually going.
   */
  flattenGroups?: boolean;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    id: "overview",
    title: "Start",
    items: [
      { href: "/", icon: Home, label: "Home" },
      { href: "/help", icon: FileText, label: "Quick Tips" },
    ],
  },
  {
    id: "daily",
    title: "Daily Operations",
    description: "Mining shift, attendance, and plant capture",
    items: [
      {
        href: "/shift-report",
        icon: NoteAdd,
        label: "Submit Shift Report",
      },
      {
        href: "/attendance",
        icon: UserCheck,
        label: "Mark Attendance",
      },
      {
        href: "/plant-report",
        icon: Factory,
        label: "Submit Plant Report",
      },
    ],
  },
  {
    id: "reporting",
    title: "Reports",
    description: "Open report pages across operations",
    featureKey: "reports.dashboard",
    items: [
      { href: "/reports", icon: FileCheck, label: "Reports Dashboard" },
      { href: "/reports/shift", icon: EventNote, label: "Shift Reports" },
      { href: "/reports/attendance", icon: Checklist, label: "Attendance" },
      { href: "/reports/plant", icon: TableRows, label: "Plant Reports" },
      {
        href: "/reports/stores-movements",
        icon: History,
        label: "Stock Movements",
      },
      { href: "/reports/fuel-ledger", icon: Fuel, label: "Fuel Ledger" },
      {
        href: "/reports/maintenance-work-orders",
        icon: Wrench,
        label: "Work Orders",
      },
      {
        href: "/reports/maintenance-equipment",
        icon: Package,
        label: "Equipment Service",
      },
      { href: "/reports/gold-chain", icon: ChartLine, label: "Gold Chain" },
      {
        href: "/reports/gold-receipts",
        icon: ReceiptLong,
        label: "Gold Receipts",
      },
      { href: "/reports/audit-trails", icon: FileCheck, label: "Audit Trails" },
      {
        href: "/reports/downtime",
        icon: BarChart3,
        label: "Downtime Analytics",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/reports/compliance-incidents",
        icon: ShieldCheck,
        label: "Incidents",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/reports/cctv-events",
        icon: Video,
        label: "CCTV Events",
        roles: ["SUPERADMIN", "MANAGER"],
      },
    ],
  },
  {
    id: "hr",
    title: "Human Resources",
    description: "Employee records and attendance roster",
    featureKey: "hr.employees",
    items: HR_TABS.map((tab) => ({
      href: tab.href,
      icon: tab.icon,
      label: tab.label,
      roles:
        tab.id === "compensation"
          ? ["SUPERADMIN", "MANAGER"]
          : HR_MODULE_ALLOWED_ROLES,
    })),
  },
  {
    id: "maintenance",
    title: "Maintenance & Assets",
    description: "Equipment, work orders, scheduling",
    featureKey: "maintenance.dashboard",
    items: [
      { href: "/maintenance", icon: Dashboard, label: "Overview" },
      {
        href: "/maintenance/equipment",
        icon: Wrench,
        label: "Equipment Register",
      },
      {
        href: "/maintenance/work-orders",
        icon: Checklist,
        label: "Work Orders",
      },
      {
        href: "/maintenance/breakdown",
        icon: ReportProblem,
        label: "Log Breakdown",
      },
      { href: "/maintenance/schedule", icon: Calendar, label: "PM Schedule" },
    ],
  },
  {
    id: "stores",
    title: "Stores & Inventory",
    description: "Inventory and fuel control",
    featureKey: "stores.dashboard",
    // Issuing and receiving left this list when they became dialogs — a write
    // action does not belong in a column of places to look.
    groups: [
      { id: "stock", label: "Stock" },
      { id: "selling", label: "What we sell" },
    ],
    items: [
      { href: "/stores/dashboard", icon: Dashboard, label: "Overview" },

      { href: "/stores/inventory", icon: Package, label: "Stock on hand", group: "stock" },
      { href: "/stores/locations", icon: MapPin, label: "Locations", group: "stock" },
      { href: "/stores/movements", icon: History, label: "Movements", group: "stock" },
      { href: "/stores/fuel", icon: Fuel, label: "Fuel log", group: "stock" },

      { href: "/stores/catalogue", icon: TableRows, label: "Catalogue", group: "selling" },
      { href: "/stores/price-lists", icon: Scale, label: "Price lists", group: "selling" },
    ],
  },
  // A school is not one thing you open either. Fifteen flat entries read as an
  // inventory of pages rather than as navigation, and "Academics" next to
  // "Results Moderation" next to "Documents" gives no sense of which of them a
  // registrar, a bursar and a class teacher each live in. Grouped the way a
  // school is actually organised — the people, the teaching week, the money,
  // the paperwork — each group expanding to its own children, which is the
  // pattern the CRM section above already sets.
  //
  // Every group shares `schools.core`, so a tenant without the module loses the
  // whole set rather than being left with six empty headings.
  {
    id: "schools",
    title: "School Operations",
    description: "Full school management operations and portals",
    featureKey: "schools.core",
    flattenGroups: true,
    groups: [
      { id: "people", label: "People" },
      { id: "teaching", label: "Teaching" },
      { id: "attendance", label: "Attendance and welfare" },
      { id: "assessment", label: "Assessment" },
      { id: "money", label: "Fees" },
      { id: "admin", label: "Office" },
    ],
    items: [
      { href: "/schools", icon: Building2, label: "School Overview" },

      { href: "/schools/students", icon: Users, label: "Students", group: "people" },
      { href: "/schools/students/roll-up", icon: Users, label: "Roll up the year", group: "people" },
      { href: "/schools/guardians", icon: Users, label: "Guardians", group: "people" },
      { href: "/schools/teachers", icon: ManageAccounts, label: "Teachers", group: "people" },
      { href: "/schools/admissions", icon: EventNote, label: "Admissions", group: "people" },

      { href: "/schools/academics", icon: TableRows, label: "Academics setup", group: "teaching" },
      { href: "/schools/timetable", icon: Calendar, label: "Timetable", group: "teaching" },
      { href: "/schools/classes", icon: TableRows, label: "Classes", group: "teaching" },
      { href: "/schools/subjects", icon: TableRows, label: "Subjects", group: "teaching" },

      { href: "/schools/attendance", icon: UserCheck, label: "Attendance", group: "attendance" },
      { href: "/schools/boarding", icon: Home, label: "Boarding", group: "attendance" },
      { href: "/schools/boarding/welfare", icon: Home, label: "Health and welfare", group: "attendance" },

      { href: "/schools/assessments", icon: FileCheck, label: "Assessments & marks", group: "assessment" },
      { href: "/schools/results/moderation", icon: FileCheck, label: "Moderation", group: "assessment" },
      { href: "/schools/results/publish", icon: FileCheck, label: "Results publishing", group: "assessment" },

      { href: "/schools/finance", icon: ReceiptLong, label: "Fees and finance", group: "money" },

      { href: "/schools/notices", icon: EventNote, label: "Notices", group: "admin" },
      { href: "/schools/reports", icon: BarChart3, label: "School reports", group: "admin" },
      { href: "/schools/documents", icon: FileText, label: "Documents", group: "admin" },
    ],
  },
  {
    id: "car-sales",
    title: "Auto Sales",
    description: "Vehicle sales pipeline and deal operations",
    featureKey: "autos.core",
    items: [
      { href: "/car-sales", icon: LocalShipping, label: "Auto Overview" },
      { href: "/car-sales/leads", icon: Users, label: "Leads" },
      { href: "/car-sales/inventory", icon: Package, label: "Inventory" },
      { href: "/car-sales/deals", icon: Checklist, label: "Deals" },
      { href: "/car-sales/financing", icon: Wallet, label: "Financing" },
    ],
  },
  {
    id: "retail",
    title: "Retail",
    description: "Overview, sell, stock, buy, customers, cash control, accounting, insights, and setup",
    featureKey: "retail.core",
    items: RETAIL_TABS.map((tab) => ({
      href: tab.href,
      icon: tab.icon,
      label: tab.label,
    })),
  },
  {
    // Retail's customer ledger, not the CRM module. It used to share the id
    // "crm" with it, and since section lookups are built from this array the
    // later entry silently won.
    id: "retail-customers",
    title: "Customers",
    description: "Customer profiles, loyalty, and ledgers",
    featureKey: "crm.customers",
    items: [
      { href: "/retail/customers", icon: Users, label: "Customers" },
    ],
  },
  {
    id: "gold",
    title: "Gold Operations",
    description: "Production, settlement, and control tasks",
    featureKey: "gold.home",
    items: [
      { href: "/gold", icon: Coins, label: "Overview" },
      {
        href: "/gold/intake/pours/new",
        icon: Dataset,
        label: "Log Gold Output",
      },
      {
        href: "/gold/intake/purchases/new",
        icon: Payments,
        label: "Record Purchase",
      },
      {
        href: "/gold/transit/dispatches/new",
        icon: LocalShipping,
        label: "Record Dispatch",
      },
      {
        href: "/gold/settlement/receipts/new",
        icon: ReceiptLong,
        label: "Record Settlement Receipt",
      },
      { href: "/gold/exceptions", icon: ReportProblem, label: "Exceptions" },
      { href: "/reports/gold-chain", icon: ChartLine, label: "Gold Reports" },
    ],
  },
  {
    id: "scrap-metal",
    title: "Scrap & Recycling",
    description: "Ticketing, lots, settlements, and material controls",
    featureKey: "scrap-metal.home",
    items: SCRAP_TABS.map((tab) => ({
      href: tab.href,
      icon: tab.icon,
      label: tab.label,
      roles: tab.roles,
    })),
  },
  // The CRM is not one thing you open, it is six. A single parent entry meant
  // every route inside it cost two clicks and hid behind a word — "CRM" — that
  // names a category rather than a place. Its groups are root entries now,
  // each expanding to its own children, which is how the reference works and
  // how anybody actually describes where they are going: "the pipeline",
  // "records", "the paperwork".
  //
  // They share `crm.core`, so a tenant without the module loses the whole set
  // rather than being left with six empty headings.
  {
    id: "crm",
    title: "CRM",
    description: "Leads, clients, site visits, and sales pipeline",
    featureKey: "crm.core",
    // Rendered flat: each group below becomes its own root entry in the
    // sidebar rather than a band inside a "CRM" parent. "CRM" names a category,
    // not a place — nobody says "I'm going to CRM", they say "the pipeline" or
    // "the paperwork", and burying six of those behind one word cost a click
    // each and told you nothing on the way past.
    flattenGroups: true,
    groups: [
      // Attio's word, and the right one: these are the kinds of thing the CRM
      // keeps, and somebody looking for People is looking for an object, not
      // for "records" as opposed to "pipeline". Splitting leads and deals away
      // from people and companies drew a line the data does not have.
      { id: "objects", label: "Objects" },
      { id: "work", label: "Work" },
      { id: "documents", label: "Sales documents" },
      { id: "learn", label: "Insights" },
      { id: "workflows", label: "Workflows" },
      { id: "setup", label: "CRM setup" },
    ],
    items: [
      { href: "/crm", icon: Dashboard, label: "CRM overview" },

      { href: "/crm/leads", icon: Funnel, label: "Leads", group: "objects" },
      { href: "/crm/deals", icon: Funnel, label: "Deals", group: "objects" },
      { href: "/crm/forms", icon: NoteAdd, label: "Intake forms", group: "work" },

      { href: "/crm/people", icon: Users, label: "People", group: "objects" },
      { href: "/crm/companies", icon: Building2, label: "Companies", group: "objects" },
      { href: "/crm/sites", icon: MapPin, label: "Sites", group: "objects" },
      { href: "/crm/reps", icon: UserRound, label: "Sales reps", group: "objects" },

      { href: "/crm/tasks", icon: Checklist, label: "Tasks", group: "work" },
      { href: "/crm/appointments", icon: CalendarCheck, label: "Site visits", group: "work" },
      { href: "/crm/follow-ups", icon: Phone, label: "Follow-ups", group: "work" },

      { href: "/crm/quotes", icon: FileText, label: "Quotes", group: "documents" },
      { href: "/crm/invoices", icon: ReceiptLong, label: "Invoices", group: "documents" },
      { href: "/crm/receipts", icon: Payments, label: "Receipts", group: "documents" },
      { href: "/crm/work-orders", icon: Wrench, label: "Work orders", group: "documents" },
      { href: "/crm/collections", icon: Scale, label: "Collections", group: "documents" },

      { href: "/crm/insights", icon: BarChart3, label: "Insights", group: "learn" },
      { href: "/crm/reports", icon: ChartLine, label: "Sales reports", group: "learn" },

      {
        href: "/crm/workflows",
        icon: Zap,
        label: "Workflows",
        roles: ["SUPERADMIN", "MANAGER"],
        group: "workflows",
      },
      {
        href: "/crm/workflows/runs",
        icon: History,
        label: "Workflow activity",
        roles: ["SUPERADMIN", "MANAGER"],
        group: "workflows",
      },

      { href: "/crm/import", icon: Upload, label: "Import", group: "setup" },
      {
        href: "/crm/settings",
        icon: ManageAccounts,
        label: "CRM settings",
        roles: ["SUPERADMIN", "MANAGER"],
        group: "setup",
      },
    ],
  },
  {
    id: "cctv",
    title: "CCTV",
    description: "Surveillance and stream control",
    featureKey: "cctv.overview",
    items: [
      {
        href: "/cctv/overview",
        icon: Dashboard,
        label: "Overview",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/cctv/live",
        icon: Video,
        label: "Live Monitor",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/cctv/cameras",
        icon: Camera,
        label: "Cameras",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/cctv/nvrs",
        icon: Server,
        label: "NVRs",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/cctv/events",
        icon: AlertCircle,
        label: "Events",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/cctv/playback",
        icon: History,
        label: "Playback",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/cctv/access-logs",
        icon: FileCheck,
        label: "Access Logs",
        roles: ["SUPERADMIN", "MANAGER"],
      },
    ],
  },
  {
    id: "accounting",
    title: "Accounting",
    description: "Ledger, journals, and finance controls",
    featureKey: "accounting.core",
    items: [
      { href: "/accounting", icon: Scale, label: "Accounting Overview" },
      { href: "/accounting/receivables", icon: ReceiptLong, label: "Receivables" },
      { href: "/accounting/payables", icon: PackageCheck, label: "Payables" },
      { href: "/accounting/financial-reports", icon: BarChart3, label: "Financial Reports" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    description: "Organisation settings and administration",
    items: [
      {
        href: "/dashboard",
        icon: Dashboard,
        label: "Production Dashboard",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/compliance",
        icon: ShieldCheck,
        label: "Compliance",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/preferences/organization/users",
        icon: UserRound,
        label: "Users",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/management/master-data",
        icon: TableRows,
        label: "Master Data",
        roles: ["SUPERADMIN", "MANAGER"],
      },
      {
        href: "/preferences/organization/branding/identity",
        icon: Building2,
        label: "Branding",
        roles: ["SUPERADMIN", "MANAGER"],
      },
    ],
  },
  {
    id: "templates",
    title: "Templates",
    description: "Every form, quote layout and document the company sends",
    items: [
      {
        href: "/templates",
        icon: FileText,
        label: "Templates",
        roles: ["SUPERADMIN", "MANAGER"],
      },
    ],
  },
];

export function getNavSectionsForRole(role: string | null | undefined) {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.roles ? hasRole(role, item.roles) : true,
      ),
    }))
    .filter((section) => section.items.length > 0);
}
