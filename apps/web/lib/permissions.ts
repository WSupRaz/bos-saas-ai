// apps/web/lib/permissions.ts
import { type Role } from "@prisma/client";
import { ForbiddenError } from "./auth-context";
import type { AuthContext } from "./auth-context";

// Every permission maps to which roles are allowed
const PERMISSIONS = {
  // Leads / CRM
  "leads:read": ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
  "leads:write": ["OWNER", "ADMIN", "MANAGER"],
  "leads:delete": ["OWNER", "ADMIN"],

  // Tasks
  "tasks:read": ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
  "tasks:write": ["OWNER", "ADMIN", "MANAGER"],
  "tasks:delete": ["OWNER", "ADMIN"],

  // Reports
  "reports:read": ["OWNER", "ADMIN", "MANAGER"],
  "reports:submit": ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "VENDOR", "DISTRIBUTOR"],

  // Messages / WhatsApp / Email
  "messages:send": ["OWNER", "ADMIN", "MANAGER"],
  "messages:read": ["OWNER", "ADMIN", "MANAGER"],

  // Campaigns
  "campaigns:read": ["OWNER", "ADMIN", "MANAGER"],
  "campaigns:write": ["OWNER", "ADMIN"],
  "campaigns:send": ["OWNER", "ADMIN"],

  // Orders
  "orders:read": ["OWNER", "ADMIN", "MANAGER", "DISTRIBUTOR", "VENDOR"],
  "orders:write": ["OWNER", "ADMIN", "MANAGER"],
  "orders:delete": ["OWNER", "ADMIN"],

  // Inventory
  "inventory:read": ["OWNER", "ADMIN", "MANAGER", "VENDOR"],
  "inventory:write": ["OWNER", "ADMIN", "MANAGER"],

  // Market rates
  "rates:read": ["OWNER", "ADMIN", "MANAGER", "VENDOR", "DISTRIBUTOR"],
  "rates:submit": ["OWNER", "ADMIN", "MANAGER", "VENDOR", "DISTRIBUTOR"],

  // Automation
  "automations:read": ["OWNER", "ADMIN"],
  "automations:write": ["OWNER", "ADMIN"],

  // AI
  "ai:chat": ["OWNER", "ADMIN", "MANAGER"],

  // Team / users
  "users:read": ["OWNER", "ADMIN", "MANAGER"],
  "users:manage": ["OWNER", "ADMIN"],

  // Billing / org settings
  "billing:manage": ["OWNER"],
  "settings:manage": ["OWNER", "ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly string[];
  return allowed.includes(role);
}

/** Throws ForbiddenError if user does not have the permission */
export function requirePermission(ctx: AuthContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new ForbiddenError(
      `Your role (${ctx.role}) does not have permission: ${permission}`
    );
  }
}
