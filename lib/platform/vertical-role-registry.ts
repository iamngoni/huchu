import type { UserRole } from "@/lib/roles";
import type { WorkspaceProfile } from "@/lib/workspace-products";

export type ManagedWorkspaceProfile = WorkspaceProfile;

export type VerticalRoleRegistration = {
  roles: UserRole[];
};

export type FeatureRoleRegistration = {
  id: string;
  roles: UserRole[];
  featureKeys?: string[];
  featurePrefixes?: string[];
};

export const USER_ROLE_LABELS: Partial<Record<UserRole, string>> = {
  SUPERADMIN: "Superadmin",
  MANAGER: "Manager",
  CLERK: "Clerk",
  OPERATOR: "Operator",
  SCHOOL_ADMIN: "School Admin",
  REGISTRAR: "Registrar",
  BURSAR: "Bursar",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
  AUTO_MANAGER: "Auto Manager",
  SALES_EXEC: "Sales Executive",
  FINANCE_OFFICER: "Finance Officer",
  SHOP_MANAGER: "Shop Manager",
  CASHIER: "Cashier",
  STOCK_CLERK: "Stock Clerk",
};

export const VERTICAL_ROLE_REGISTRY: Record<ManagedWorkspaceProfile, VerticalRoleRegistration> = {
  GOLD_MINE: { roles: ["SUPERADMIN", "MANAGER", "CLERK", "FINANCE_OFFICER"] },
  SCRAP_METAL: { roles: ["SUPERADMIN", "MANAGER", "OPERATOR"] },
  AUTOS: { roles: ["SUPERADMIN", "MANAGER", "CLERK", "AUTO_MANAGER", "SALES_EXEC", "FINANCE_OFFICER"] },
  RETAIL: { roles: ["SUPERADMIN", "MANAGER", "CLERK", "SHOP_MANAGER", "CASHIER", "STOCK_CLERK", "FINANCE_OFFICER"] },
  SCHOOLS: { roles: ["SUPERADMIN", "MANAGER", "CLERK", "FINANCE_OFFICER"] },
  GENERAL: { roles: ["SUPERADMIN", "MANAGER", "CLERK", "OPERATOR", "FINANCE_OFFICER"] },
};

export const FEATURE_ROLE_REGISTRY: FeatureRoleRegistration[] = [
  {
    id: "crm",
    roles: ["SALES_EXEC"],
    featureKeys: ["crm.customers"],
    featurePrefixes: ["crm."],
  },
];

function normalizeFeatureKey(value: string): string {
  return value.trim().toLowerCase();
}

function registrationMatchesFeatures(
  registration: FeatureRoleRegistration,
  enabledFeatures: string[] | undefined,
): boolean {
  const normalizedFeatures = (enabledFeatures ?? []).map(normalizeFeatureKey);
  if (normalizedFeatures.length === 0) return false;

  const featureKeys = new Set((registration.featureKeys ?? []).map(normalizeFeatureKey));
  const prefixes = (registration.featurePrefixes ?? []).map(normalizeFeatureKey);

  return normalizedFeatures.some(
    (feature) =>
      featureKeys.has(feature) ||
      prefixes.some((prefix) => feature.startsWith(prefix)),
  );
}

export function getRegisteredRoles(
  profile: ManagedWorkspaceProfile,
  enabledFeatures?: string[],
): UserRole[] {
  const roles = new Set<UserRole>(
    VERTICAL_ROLE_REGISTRY[profile]?.roles ?? VERTICAL_ROLE_REGISTRY.GENERAL.roles,
  );

  for (const registration of FEATURE_ROLE_REGISTRY) {
    if (!registrationMatchesFeatures(registration, enabledFeatures)) continue;
    for (const role of registration.roles) {
      roles.add(role);
    }
  }

  return Array.from(roles);
}

