import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

/**
 * /health  — liveness probe
 *
 * Returns 200 as long as the process is alive.  No database check, because
 * the orchestrator uses a separate readiness probe for that.  Keeping it
 * cheap means the process can be restarted quickly even if the DB is down.
 */
export function liveness(req: Request, res: Response): void {
  res.json({
    status: 'ok',
    pid: process.pid,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
}

/**
 * /health/ready  — readiness probe
 *
 * Returns 200 only when the server can accept traffic, i.e. it can reach the
 * database.  If the DB is unreachable the pod will be removed from the service
 * endpoints until it recovers.
 */
export async function readiness(req: Request, res: Response): Promise<void> {
  try {
    // Lightweight ping — does not trigger heavy queries.
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      reason: 'database_unreachable',
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * /metrics  — Prometheus text format (stub)
 *
 * Replace / extend this with real metrics once you add instrumentation:
 *   - prom-client for HTTP / GC / custom counters
 *   - @opentelemetry/api for traces
 *
 * For now this returns process-level stats so Prometheus can at least scrape
* something useful before you wire up custom metrics.
 */
export function metrics(_req: Request, res: Response): void {
  const mem = process.memoryUsage()
  res.set('Content-Type', 'text/plain; version=0.0.4')
  res.send(`
# HELP process_cpu_seconds_total Total CPU time spent (seconds)
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total ${process.cpuUsage().user / 1e6 + process.cpuUsage().system / 1e6}
# HELP process_memory_bytes Virtual memory size
# TYPE process_memory_bytes gauge
process_memory_bytes ${mem.heapUsed}
# HELP nodejs_eventloop_lag_seconds Event loop lag
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0
# HELP ceooo_uptime_seconds Process uptime
# TYPE ceooo_uptime_seconds gauge
ceooo_uptime_seconds ${process.uptime()}
`)
}

/**
 * Request logging middleware (structured, JSON in production).
 *
 * Attach after body-parsing so you can log method / path / status / duration.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now()
  const reqId = (req.headers['x-request-id'] as string) || (Math.random().toString(36).slice(2))

  ;(res as any).reqId = reqId

  // Use a private symbol / property to store the start time so the finish hook
  // can compute duration.
  ;(res as any)._startAt = start

  res.on('finish', () => {
    const duration = Date.now() - start
    // Go through the shared logger so LOG_LEVEL decides what is printed. In
    // development that means no per-request INFO noise; failures still show.
    const status = res.statusCode
    const ctx = {
      reqId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status,
      durationMs: duration,
    }
    if (status >= 500) logger.error(ctx, 'request')
    else if (status >= 400) logger.warn(ctx, 'request')
    else logger.info(ctx, 'request')
  })

  next()
}

/**
 * Global error-handler that always returns JSON (never HTML stack traces in
 * production).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = (() => {
    const explicit = (err as any)?.status ?? (err as any)?.statusCode
    if (typeof explicit === 'number' && explicit >= 400 && explicit <= 599) return explicit
    // Malformed JSON bodies from the express.json() parser
    if (err instanceof SyntaxError && 'body' in (err as any)) return 400
    return 500
  })()

  const body = {
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (err instanceof Error ? err.message : String(err)),
    reqId: (res as any).reqId,
    timestamp: new Date().toISOString(),
  }

  res.status(status).json(body)
}
