import {
  Checklist,
  Coins,
  FileCheck,
  ManageAccounts,
  Payments,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "@/lib/icons";

export type HrTab =
  | "employees"
  | "shift-groups"
  | "incidents"
  | "compensation"
  | "salaries"
  | "salary-outstanding"
  | "payroll"
  | "disbursements"
  | "statutory-tables"
  | "statutory-returns"
  | "approvals";

export type HrCategoryId =
  | "people"
  | "shifts"
  | "compensation"
  | "payroll"
  // The state's side of payroll — the tables it is computed on and the returns
  // filed from it. Its own category rather than tabs under Payroll, because
  // these are the screens an accountant opens and the run screens are the
  // clerk's.
  | "statutory"
  | "approvals";

export type HrCategory = {
  id: HrCategoryId;
  label: string;
  icon: LucideIcon;
  order: number;
};

export const HR_CATEGORIES: HrCategory[] = [
  { id: "people", label: "People", icon: Users, order: 1 },
  { id: "shifts", label: "Shifts", icon: Checklist, order: 2 },
  { id: "compensation", label: "Compensation", icon: UserRound, order: 3 },
  { id: "payroll", label: "Payroll", icon: Coins, order: 4 },
  { id: "statutory", label: "Statutory", icon: ShieldCheck, order: 5 },
  { id: "approvals", label: "Approvals", icon: FileCheck, order: 6 },
];

export type HrTabItem = {
  id: HrTab;
  label: string;
  href: string;
  icon: LucideIcon;
  categoryId: HrCategoryId;
};

export const HR_TABS: HrTabItem[] = [
  {
    id: "employees",
    label: "Employees",
    href: "/human-resources",
    icon: ManageAccounts,
    categoryId: "people",
  },
  {
    id: "incidents",
    label: "Workforce Incidents",
    href: "/human-resources/incidents",
    icon: ShieldCheck,
    categoryId: "people",
  },
  {
    id: "shift-groups",
    label: "Groups",
    href: "/human-resources/shift-groups",
    icon: Users,
    categoryId: "shifts",
  },
  {
    id: "compensation",
    label: "Rules",
    href: "/human-resources/compensation",
    icon: UserRound,
    categoryId: "compensation",
  },
  {
    id: "salaries",
    label: "Salaries",
    href: "/human-resources/salaries",
    icon: Payments,
    categoryId: "compensation",
  },
  {
    id: "salary-outstanding",
    label: "Outstanding",
    href: "/human-resources/salaries/outstanding",
    icon: Wallet,
    categoryId: "compensation",
  },
  {
    id: "payroll",
    label: "Runs",
    href: "/human-resources/payroll",
    icon: Checklist,
    categoryId: "payroll",
  },
  {
    id: "disbursements",
    label: "Disbursements",
    href: "/human-resources/disbursements",
    icon: Wallet,
    categoryId: "payroll",
  },
  {
    id: "statutory-tables",
    label: "Tables & Rates",
    href: "/human-resources/statutory",
    icon: Checklist,
    categoryId: "statutory",
  },
  {
    id: "statutory-returns",
    label: "Returns",
    href: "/human-resources/statutory/returns",
    icon: FileCheck,
    categoryId: "statutory",
  },
  {
    id: "approvals",
    label: "History",
    href: "/human-resources/approvals",
    icon: FileCheck,
    categoryId: "approvals",
  },
];
