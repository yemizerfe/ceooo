import { Server } from 'http'
import { closePrisma } from './prisma'
import { logger } from './logger'

type ShutdownFn = (signal: string) => Promise<void>

/**
 * Register graceful shutdown handlers on an HTTP server.
 *
 * On SIGTERM / SIGINT:
 *   1. Stop accepting new connections (server.close)
 *   2. Wait for in-flight requests to finish (up to `gracePeriodMs`)
 *   3. Close the Prisma connection pool
 *   4. Exit with code 0
 *
 * Kubernetes sends SIGTERM and waits `terminationGracePeriodSeconds`, so the
 * grace period here must be shorter than that value.
 */
export function withGracefulShutdown(app: Server, gracePeriodMs = 10_000): void {
  let shuttingDown = false

  const shutdown: ShutdownFn = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true

    logger.info({ signal, pid: process.pid }, 'Received shutdown signal — draining connections')

    // Stop accepting new connections; keep-alive sockets are tracked so the
    // process does not hang until the orchestrator SIGKILLs it.
    const sockets = new Set<import('net').Socket>()
    app.on('connection', (socket) => {
      sockets.add(socket)
      socket.on('close', () => sockets.delete(socket))
    })

    app.close((err) => {
      if (err) logger.error({ err }, 'Error while closing HTTP server')
      else logger.info('HTTP server closed')
    })

    const forceExit = setTimeout(() => {
      logger.warn({ gracePeriodMs }, 'Graceful shutdown timed out — forcing exit')
      for (const socket of sockets) socket.destroy()
      process.exit(1)
    }, gracePeriodMs)

    try {
      await closePrisma()
      clearTimeout(forceExit)
      logger.info('Prisma connection pool closed — exiting')
      process.exit(0)
    } catch (err) {
      clearTimeout(forceExit)
      logger.error({ err }, 'Error during graceful shutdown')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

/** Crash loudly and consistently on unhandled failures. */
export function trackUncaughtErrors(): void {
  process.on('uncaughtException', (err) => {
    logger.fatal({ err, stack: err?.stack }, 'Uncaught exception — shutting down')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection — shutting down')
    process.exit(1)
  })
}
