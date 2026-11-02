// server/services/adminBootstrap.service.ts
// =============================================================================
// Administrator bootstrap
// =============================================================================
// Promotes (or creates) the platform administrator from environment variables
// so no credentials ever live in source control:
//
//   ADMIN_EMAIL            the account to grant administration to (required)
//   ADMIN_PASSWORD         password to set when the account is created
//   ADMIN_NAME             optional display name
//   ADMIN_RESET_PASSWORD   "true" forces the password to being re-set on boot
//
// Safe to run on every boot: it is idempotent and never touches an existing
// password unless ADMIN_RESET_PASSWORD is explicitly enabled.
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { ADMIN_ROLES, ensureRbacCatalog } from './rbac.service'

const ADMIN_ACCESS_ROLE = 'ADMIN'

export interface BootstrapAdminResult {
  action: 'created' | 'promoted' | 'unchanged' | 'skipped'
  email?: string
  reason?: string
}

function normaliseEmail(value: string | undefined): string | null {
  const email = value?.trim().toLowerCase()
  return email && email.includes('@') ? email : null
}

/**
 * Ensure the configured administrator account exists, is active and holds the
 * ADMIN access role.
 */
export async function ensureBootstrapAdmin(): Promise<BootstrapAdminResult> {
  const email = normaliseEmail(process.env.ADMIN_EMAIL)
  if (!email) {
    return { action: 'skipped', reason: 'ADMIN_EMAIL is not set' }
  }

  // The RBAC catalog must exist before the role can be assigned.
  await ensureRbacCatalog().catch((err) => {
    logger.warn({ err }, 'RBAC catalog unavailable during admin bootstrap')
  })

  const password = process.env.ADMIN_PASSWORD
  const resetPassword = String(process.env.ADMIN_RESET_PASSWORD ?? '').toLowerCase() === 'true'
  const displayName = process.env.ADMIN_NAME?.trim() || null

  if (!password && !resetPassword) {
    // Promotion still works without a password if the account already exists.
    const existingWithoutPassword = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    })
    if (!existingWithoutPassword?.passwordHash) {
      return {
        action: 'skipped',
        email,
        reason: 'ADMIN_PASSWORD is required to create or repair this account',
      }
    }
  }

  if (password && password.length < 8) {
    return { action: 'skipped', email, reason: 'ADMIN_PASSWORD must be at least 8 characters' }
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, accessRole: true, isActive: true, passwordHash: true, name: true },
  })

  const alreadyAdmin =
    existing?.accessRole != null && (ADMIN_ROLES as readonly string[]).includes(existing.accessRole)

  if (!existing) {
    if (!password) {
      return { action: 'skipped', email, reason: 'no such account and no ADMIN_PASSWORD provided' }
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name: displayName,
        role: 'Administrator',
        accessRole: ADMIN_ACCESS_ROLE,
        isActive: true,
        hasCompletedOnboarding: true,
      },
    })

    logger.info({ email }, 'Bootstrap administrator account created')
    return { action: 'created', email }
  }

  const data: Record<string, unknown> = {
    accessRole: ADMIN_ACCESS_ROLE,
    isActive: true,
  }
  if (displayName && !existing.name) data.name = displayName
  if (password && (!existing.passwordHash || resetPassword)) {
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  const changed = !alreadyAdmin || !existing.isActive || Boolean(data.passwordHash)
  if (changed) {
    await prisma.user.update({ where: { email }, data })
    logger.info({ email, promoted: !alreadyAdmin }, 'Bootstrap administrator account updated')
  }

  return { action: alreadyAdmin && !changed ? 'unchanged' : 'promoted', email }
}
