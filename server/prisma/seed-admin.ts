// server/prisma/seed-admin.ts
// =============================================================================
// Provision the platform administrator
// =============================================================================
// Credentials come from the environment — never from source control:
//
//   ADMIN_EMAIL=admin@example.com \
//   ADMIN_PASSWORD='a-long-password' \
//   ADMIN_NAME='Platform Admin' \
//   bun run admin:create
//
// Add ADMIN_RESET_PASSWORD=true to overwrite an existing password.
// The command is idempotent: run it as often as you like.
import 'dotenv/config'
import { ensureBootstrapAdmin } from '../services/adminBootstrap.service'
import { prisma } from '../lib/prisma'

const result = await ensureBootstrapAdmin()

switch (result.action) {
  case 'created':
    console.log(`✓ Created administrator ${result.email}`)
    break
  case 'promoted':
    console.log(`✓ Administrator ready: ${result.email}`)
    break
  case 'unchanged':
    console.log(`✓ Administrator already up to date: ${result.email}`)
    break
  default:
    console.log(`• Skipped: ${result.reason}`)
    process.exitCode = 1
}

await prisma.$disconnect()
