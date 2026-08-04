export type PersonaDomain = "schools" | "autos" | "retail" | "portal";

export type PersonaCode =
  | "SCHOOL_ADMIN"
  | "REGISTRAR"
  | "BURSAR"
  | "HOD"
  | "TEACHER"
  | "WARDEN"
  | "PARENT"
  | "STUDENT"
  | "SALES_MANAGER"
  | "SALES_EXEC"
  | "LOT_MANAGER"
  | "CASHIER"
  | "STOCK_CLERK"
  | "RETAIL_MANAGER";

export interface PersonaDefinition {
  code: PersonaCode;
  domain: PersonaDomain;
  label: string;
  description: string;
}

export interface PersonaPermission {
  resource: string;
  actions: string[];
}

export const PERSONAS: PersonaDefinition[] = [
  { code: "SCHOOL_ADMIN", domain: "schools", label: "School Admin", description: "Full schools pack administration." },
  { code: "REGISTRAR", domain: "schools", label: "Registrar", description: "Admissions, students, and records lifecycle." },
  { code: "BURSAR", domain: "schools", label: "Bursar", description: "Fees, receipts, and school finance operations." },
  { code: "HOD", domain: "schools", label: "Head Of Department", description: "Results moderation and academic approvals." },
  { code: "TEACHER", domain: "schools", label: "Teacher", description: "Class attendance, marks entry, and result submissions." },
  { code: "WARDEN", domain: "schools", label: "Warden", description: "Boarding operations, bed allocations, and leave workflows." },
  { code: "PARENT", domain: "portal", label: "Parent", description: "Portal access for linked child records and fees." },
  { code: "STUDENT", domain: "portal", label: "Student", description: "Portal access for own timetable, attendance, and results." },
  { code: "SALES_MANAGER", domain: "autos", label: "Sales Manager", description: "Car sales deals, approvals, and pipeline oversight." },
  { code: "SALES_EXEC", domain: "autos", label: "Sales Executive", description: "Lead handling and deal progression." },
  { code: "LOT_MANAGER", domain: "autos", label: "Lot Manager", description: "Vehicle inventory and lot control." },
  { code: "CASHIER", domain: "retail", label: "Cashier", description: "POS selling, shift open/close, and tender capture." },
  { code: "STOCK_CLERK", domain: "retail", label: "Stock Clerk", description: "Catalog upkeep, receiving coordination, and stock movement support." },
  { code: "RETAIL_MANAGER", domain: "retail", label: "Retail Manager", description: "Pricing, promotions, cash-up approvals, and retail governance." },
];

/** Everything a school resource can be asked to do. */
const SCHOOL_FULL_ACTIONS: string[] = [
  "view",
  "create",
  "edit",
  "archive",
  "approve",
  "invite",
  "capture",
  "submit",
  "moderate",
  "request-changes",
  "publish",
  "unpublish",
  "issue",
  "receive-payment",
  "waive",
  "write-off",
  "void",
  "refund",
  "allocate-bed",
  "approve-leave",
  "check-in",
  "check-out",
];

const PERMISSIONS_BY_PERSONA: Record<PersonaCode, PersonaPermission[]> = {
  // The school grants were written as a sketch — SCHOOL_ADMIN carried no
  // `schools.fees` at all despite being described as full administration, so
  // enforcing them as they stood would have locked the head out of the fee
  // ledger. They are now complete, and each persona's spread follows the
  // description it already carried in PERSONAS above.
  SCHOOL_ADMIN: [
    { resource: "schools.academics", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.admissions", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.students", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.teachers", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.attendance", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.fees", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.boarding", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.results", actions: SCHOOL_FULL_ACTIONS },
    { resource: "schools.reports", actions: SCHOOL_FULL_ACTIONS },
  ],
  REGISTRAR: [
    { resource: "schools.academics", actions: ["view", "create", "edit"] },
    { resource: "schools.admissions", actions: ["view", "create", "edit", "approve"] },
    { resource: "schools.students", actions: ["view", "create", "edit", "archive", "invite"] },
    { resource: "schools.teachers", actions: ["view", "create", "edit"] },
    { resource: "schools.attendance", actions: ["view"] },
    { resource: "schools.fees", actions: ["view"] },
    { resource: "schools.boarding", actions: ["view"] },
    { resource: "schools.results", actions: ["view"] },
    { resource: "schools.reports", actions: ["view"] },
  ],
  BURSAR: [
    { resource: "schools.academics", actions: ["view"] },
    { resource: "schools.admissions", actions: ["view"] },
    { resource: "schools.students", actions: ["view", "invite"] },
    {
      resource: "schools.fees",
      actions: [
        "view",
        "create",
        "edit",
        "issue",
        "receive-payment",
        "waive",
        "write-off",
        "void",
        "refund",
      ],
    },
    { resource: "schools.reports", actions: ["view"] },
  ],
  HOD: [
    { resource: "schools.academics", actions: ["view"] },
    { resource: "schools.students", actions: ["view"] },
    { resource: "schools.teachers", actions: ["view"] },
    { resource: "schools.attendance", actions: ["view"] },
    {
      resource: "schools.results",
      actions: ["view", "moderate", "request-changes", "approve"],
    },
    { resource: "schools.reports", actions: ["view"] },
  ],
  TEACHER: [
    { resource: "schools.academics", actions: ["view"] },
    { resource: "schools.students", actions: ["view"] },
    { resource: "schools.attendance", actions: ["view", "capture", "submit"] },
    { resource: "schools.results", actions: ["view", "capture", "submit"] },
  ],
  WARDEN: [
    { resource: "schools.students", actions: ["view"] },
    { resource: "schools.attendance", actions: ["view"] },
    {
      resource: "schools.boarding",
      actions: [
        "view",
        "create",
        "edit",
        "allocate-bed",
        "approve-leave",
        "check-in",
        "check-out",
      ],
    },
    { resource: "schools.reports", actions: ["view"] },
  ],
  PARENT: [
    { resource: "schools.portal.parent", actions: ["view-linked-students", "view-fees", "view-results"] },
  ],
  STUDENT: [
    { resource: "schools.portal.student", actions: ["view-own-profile", "view-own-attendance", "view-own-results"] },
  ],
  SALES_MANAGER: [
    { resource: "autos.deals", actions: ["view", "create", "edit", "approve"] },
    { resource: "autos.leads", actions: ["view", "assign", "convert"] },
  ],
  SALES_EXEC: [
    { resource: "autos.leads", actions: ["view", "create", "edit", "convert"] },
    { resource: "autos.deals", actions: ["view", "create", "edit"] },
  ],
  LOT_MANAGER: [
    { resource: "autos.inventory", actions: ["view", "create", "edit", "transfer"] },
  ],
  CASHIER: [
    { resource: "retail.pos", actions: ["view", "sell", "close-shift"] },
    { resource: "retail.refunds", actions: ["request"] },
  ],
  STOCK_CLERK: [
    { resource: "retail.purchasing", actions: ["view", "create", "receive"] },
    { resource: "retail.catalog", actions: ["view", "edit"] },
  ],
  RETAIL_MANAGER: [
    { resource: "retail.pos", actions: ["view", "sell", "override"] },
    { resource: "retail.shifts", actions: ["view", "run", "approve"] },
    { resource: "retail.promotions", actions: ["view", "edit", "apply"] },
  ],
};

export function getPersonaDefinitions(): PersonaDefinition[] {
  return PERSONAS;
}

export function getPersonaPermissions(persona: PersonaCode): PersonaPermission[] {
  return PERMISSIONS_BY_PERSONA[persona] ?? [];
}

export function hasPersonaPermission(
  personas: PersonaCode[] | undefined,
  resource: string,
  action: string,
): boolean {
  if (!personas || personas.length === 0) return false;
  return personas.some((persona) =>
    getPersonaPermissions(persona).some(
      (permission) =>
        permission.resource === resource && permission.actions.includes(action),
    ),
  );
}


/**
 * The persona a signed-in user acts as.
 *
 * The persona catalogue has always described what each role may do, but nothing
 * mapped a `UserRole` onto a `PersonaCode`, so `hasPersonaPermission` had zero
 * call sites and the grants were decoration. This is that map.
 *
 * `SUPERADMIN` and `MANAGER` return null deliberately: they are the tenant's
 * own administrators and are not constrained by a vertical persona. Callers
 * check for them before asking here.
 */
const ROLE_TO_PERSONA: Record<string, PersonaCode> = {
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  REGISTRAR: "REGISTRAR",
  BURSAR: "BURSAR",
  HOD: "HOD",
  WARDEN: "WARDEN",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
  STUDENT: "STUDENT",
  AUTO_MANAGER: "SALES_MANAGER",
  SALES_EXEC: "SALES_EXEC",
  SHOP_MANAGER: "RETAIL_MANAGER",
  CASHIER: "CASHIER",
  STOCK_CLERK: "STOCK_CLERK",
};

export function personaForRole(role?: string | null): PersonaCode | null {
  if (!role) return null;
  return ROLE_TO_PERSONA[role.trim().toUpperCase()] ?? null;
}
