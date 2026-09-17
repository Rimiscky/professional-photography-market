export const roles = ["CUSTOMER", "PHOTOGRAPHER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof roles)[number];
export const permissions = ["account:read", "purchase:create", "download:own", "image:own:write", "finance:own:read", "moderation:write", "admin:read", "settings:critical:write"] as const;
export type Permission = (typeof permissions)[number];
const rolePermissions: Record<Role, readonly Permission[]> = {
  CUSTOMER: ["account:read", "purchase:create", "download:own"],
  PHOTOGRAPHER: ["account:read", "purchase:create", "download:own", "image:own:write", "finance:own:read"],
  MODERATOR: ["account:read", "moderation:write", "admin:read"], ADMIN: ["account:read", "moderation:write", "admin:read"], SUPER_ADMIN: permissions,
};
export const hasPermission = (userRoles: readonly Role[], permission: Permission) => userRoles.some((role) => rolePermissions[role].includes(permission));
export function assertPermission(userRoles: readonly Role[], permission: Permission) { if (!hasPermission(userRoles, permission)) throw new Error("FORBIDDEN"); }
export function assertOwnership(actorId: string, ownerId: string) { if (!actorId || actorId !== ownerId) throw new Error("FORBIDDEN"); }
