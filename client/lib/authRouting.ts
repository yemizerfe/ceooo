/**
 * Authorization is resolved from `accessRole` — the RBAC catalog key returned
 * by the API. `role` is a free-text job title ("CEO / Founder") and must never
 * decide where a user lands, otherwise an administrator is sent to the
 * executive dashboard and a non-admin whose title reads "ADMIN" reaches the
 * admin panel.
 */
type RoleLike =
  | string
  | {
      role?: string | null;
      accessRole?: string | null;
      isAdmin?: boolean;
    }
  | null
  | undefined;

function resolveAccessRole(input: RoleLike): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input.accessRole) return input.accessRole;
  if (input.isAdmin) return "ADMIN";
  return input.role ?? null;
}

export function isPlatformAdmin(input: RoleLike): boolean {
  const accessRole = resolveAccessRole(input);
  return accessRole === "ADMIN" || accessRole === "SUPER_ADMIN";
}

export function isAdminPath(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  return path === "/admin" || path.startsWith("/admin/");
}

export function getAuthenticatedHomePath(input: RoleLike): "/admin" | "/dashboard" {
  return isPlatformAdmin(input) ? "/admin" : "/dashboard";
}