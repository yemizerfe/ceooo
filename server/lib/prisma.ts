import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client singleton.
 *
 * Connection pooling is configured through the datasource URL, e.g.
 *   postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20
 * Keeping `connection_limit * replicas` below Postgres `max_connections`
 * is what prevents pool exhaustion during a rolling deploy.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/** Close the pool so the process can exit cleanly on SIGTERM. */
export async function closePrisma(): Promise<void> {
  await prisma.$disconnect()
}

/** Fail fast at boot if the database is unreachable. */
export async function assertDatabaseConnection(retries = 10, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

export default prisma