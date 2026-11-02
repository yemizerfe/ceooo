// services/adminUser.service.ts
// Write operations for platform user management.
//
// Every guard that protects the platform from lock-out lives here so the
// controllers stay thin:
//   * the last active administrator can never be suspended, demoted or deleted
//   * an administrator can never lock themselves out of the platform
//   * roles must exist in the RBAC catalog before assignment
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.ts';
import { countActiveAdmins } from '../middleware/admin.middleware.ts';
import { passwordPolicyError, getPlatformSettings } from './platformSettings.service.ts';
import { ensureRbacCatalog, invalidateRbacCache, isAdminRole, resolveAccessRoleName } from './rbac.service.ts';
import { revokeUserTokens } from '../lib/tokenRevocation.ts';

export class AdminActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AdminActionError';
    this.status = status;
  }
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: string;
  organizationId?: string | null;
  isVerified?: boolean;
}

export async function listAssignableRoles(): Promise<{ name: string; label: string }[]> {
  await ensureRbacCatalog();
  const roles = await prisma.role.findMany({
    select: { name: true, label: true },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
  return roles;
}

async function assertRoleExists(role: string): Promise<void> {
  const found = await prisma.role.findUnique({ where: { name: role }, select: { id: true } });
  if (!found) {
    throw new AdminActionError(`Role "${role}" does not exist`, 400);
  }
}

async function assertNotLastAdmin(targetUserId: string, what: string): Promise<void> {
  const remaining = await countActiveAdmins(targetUserId);
  if (remaining === 0) {
    throw new AdminActionError(
      `Cannot ${what}: this is the last active administrator account on the platform.`,
      409
    );
  }
}

export async function createUser(input: CreateUserInput) {
  const settings = await getPlatformSettings();
  const email = input.email.trim().toLowerCase();

  const policyError = passwordPolicyError(input.password, settings.requireStrongPassword);
  if (policyError) throw new AdminActionError(policyError, 400);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AdminActionError('A user with this email already exists', 409);

  await assertRoleExists(input.role);

  if (input.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true },
    });
    if (!org) throw new AdminActionError('Organization not found', 404);
  }

  return prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash: await bcrypt.hash(input.password, 10),
      // Admin-managed accounts carry a catalog role in `accessRole`. `role` is
      // kept in sync for display, but authorization reads accessRole.
      accessRole: input.role,
      role: input.role,
      organizationId: input.organizationId ?? null,
      isVerified: input.isVerified ?? true,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accessRole: true,
      isActive: true,
      isVerified: true,
      organizationId: true,
      createdAt: true,
    },
  });
}


export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string | null;
  isVerified?: boolean;
}

export async function updateUser(
  targetUserId: string,
  actorUserId: string,
  input: UpdateUserInput
) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, accessRole: true, isActive: true },
  });
  if (!target) throw new AdminActionError('User not found', 404);

  const data: Record<string, unknown> = {};

  if (typeof input.name === 'string' && input.name.trim()) {
    data.name = input.name.trim();
  }

  if (typeof input.email === 'string' && input.email.trim()) {
    const email = input.email.trim().toLowerCase();
    if (email !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (clash) throw new AdminActionError('A user with this email already exists', 409);
      data.email = email;
    }
  }

  // Admin role assignment writes `accessRole` (the RBAC key) and mirrors it into
  // `role` so the admin list keeps showing a meaningful label. The last-admin
  // guards compare the EFFECTIVE role, so a legacy row that only has a job title
  // in `role` is still handled correctly.
  if (typeof input.role === 'string' && input.role !== target.accessRole) {
    await assertRoleExists(input.role);

    const targetIsAdmin = isAdminRole(resolveAccessRoleName(target.accessRole ?? target.role));

    if (target.id === actorUserId && !isAdminRole(input.role)) {
      throw new AdminActionError('You cannot remove your own administrator role', 409);
    }

    if (targetIsAdmin && !isAdminRole(input.role)) {
      await assertNotLastAdmin(target.id, 'change the role of the last administrator');
    }

    data.accessRole = input.role;
    data.role = input.role;
  }

  if (input.organizationId !== undefined) {
    if (input.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { id: true },
      });
      if (!org) throw new AdminActionError('Organization not found', 404);
    }
    data.organizationId = input.organizationId || null;
  }

  if (typeof input.isVerified === 'boolean') {
    data.isVerified = input.isVerified;
  }

  if (Object.keys(data).length === 0) {
    throw new AdminActionError('No changes were provided', 400);
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accessRole: true,
      isActive: true,
      isVerified: true,
      organizationId: true,
      createdAt: true,
    },
  });

  if (typeof data.accessRole === 'string') invalidateRbacCache();

  return updated;
}

export async function changeUserRole(targetUserId: string, actorUserId: string, role: string) {
  if (targetUserId === actorUserId) {
    throw new AdminActionError('You cannot change your own role', 409);
  }
  return updateUser(targetUserId, actorUserId, { role });
}

/** Suspend (or reactivate) an account. Suspending revokes every active token. */
export async function setUserActive(targetUserId: string, actorUserId: string, isActive: boolean) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, accessRole: true, isActive: true },
  });
  if (!target) throw new AdminActionError('User not found', 404);

  if (isActive === target.isActive) {
    throw new AdminActionError(
      isActive ? 'This account is already active' : 'This account is already suspended',
      409
    );
  }

  if (!isActive) {
    if (target.id === actorUserId) {
      throw new AdminActionError('You cannot suspend your own account', 409);
    }
    if (isAdminRole(resolveAccessRoleName(target.accessRole ?? target.role))) {
      await assertNotLastAdmin(target.id, 'suspend the last administrator');
    }
    // Cut access immediately instead of waiting for the token to expire.
    await revokeUserTokens(target.id);
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accessRole: true,
      isActive: true,
      isVerified: true,
      organizationId: true,
      createdAt: true,
    },
  });

  return updated;
}

/**
 * Reset access: rotate the password and sign the user out of every session.
 * A random password is generated (never a weak default) and returned ONCE so
 * the administrator can hand it over out-of-band. It is never stored in the
 * audit metadata and never logged.
 */
export async function resetUserAccess(targetUserId: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) throw new AdminActionError('User not found', 404);

  const temporaryPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash: await bcrypt.hash(temporaryPassword, 10),
      // A reset invalidates email verification confidence; the user must
      // re-authenticate and can complete verification again.
      isVerified: false,
    },
  });

  await revokeUserTokens(targetUserId);

  return { temporaryPassword };
}

/** Permanently delete an account. Requires the caller to type the email. */
export async function deleteUser(targetUserId: string, actorUserId: string, confirmation: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, accessRole: true },
  });
  if (!target) throw new AdminActionError('User not found', 404);

  if (target.id === actorUserId) {
    throw new AdminActionError('You cannot delete your own account', 409);
  }

  if (confirmation.trim().toLowerCase() !== target.email.toLowerCase()) {
    throw new AdminActionError('The confirmation text does not match the user email', 400);
  }

  if (isAdminRole(resolveAccessRoleName(target.accessRole ?? target.role))) {
    await assertNotLastAdmin(target.id, 'delete the last administrator');
  }

  await revokeUserTokens(target.id);
  await prisma.user.delete({ where: { id: target.id } });

  return { id: target.id, email: target.email };
}

/** Cryptographically random temporary password that satisfies the policy. */
function generateTemporaryPassword(length = 14): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = lower + upper + digits + symbols;

  const randomIndex = (max: number): number => {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0] % max;
  };

  const chars = [
    lower[randomIndex(lower.length)],
    upper[randomIndex(upper.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);

  // Fisher-Yates shuffle so the mandatory characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
