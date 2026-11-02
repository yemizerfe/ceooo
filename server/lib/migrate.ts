#!/usr/bin/env bun
/**
 * CEOOO — one-shot migration runner
 *
 * Usage:
 *   bun run src/lib/migrate.ts
 *
 * Runs `prisma migrate deploy` and exits.  Intended to run inside the
 * migrate Kubernetes Job / Docker Compose migrate service, NOT as part of
 * the long-running server start.
 */
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

async function main() {
  console.log('[migrate] Starting prisma migrate deploy ...')
  try {
    await prisma.$executeRaw`SELECT 1`
    console.log('[migrate] Database is reachable.')
  } catch (err) {
    console.error('[migrate] Cannot reach database:', err)
    process.exit(1)
  }

  try {
    execSync('bunx prisma migrate deploy', { stdio: 'inherit' })
    console.log('[migrate] Migrations applied successfully.')
  } catch (err) {
    console.error('[migrate] Migration failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
