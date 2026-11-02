/**
 * CEOOO — structured logger
 *
 * Production output is newline-delimited JSON so log aggregators
 * (Vector, Fluent Bit, Loki, CloudWatch, Datadog…) can parse it.
 * Development output is human readable.
 *
 * The public API is intentionally pino-compatible — both call styles work:
 *   logger.info('message', { ctx })
 *   logger.info({ ctx }, 'message')
 */
import { randomUUID } from 'crypto'

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  msg: string
  ts: number
  pid: number
  v: 1
  reqId?: string
  [key: string]: unknown
}

const LEVEL_MAP: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
}

// Level shown by default. Development stays quiet so the terminal only shows
// warnings and errors; set LOG_LEVEL=info (or debug/trace) to see the rest.
const MIN_LEVEL = (() => {
  const env = process.env.LOG_LEVEL?.toLowerCase()
  if (env && LEVEL_MAP[env as LogLevel] !== undefined) return LEVEL_MAP[env as LogLevel]
  if (process.env.NODE_ENV === 'production') return LEVEL_MAP.info
  return LEVEL_MAP.warn
})()

/** JSON.stringify replacer that survives BigInt / Error / circular refs. */
function makeReplacer() {
  const seen = new WeakSet<object>()
  return (_key: string, value: unknown): unknown => {
    if (typeof value === 'bigint') return value.toString()
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack }
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  }
}

const RESERVED = new Set(['level', 'msg', 'ts', 'pid', 'v', 'reqId'])

export function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry, makeReplacer())
  }

  const time = new Date(entry.ts).toISOString()
  const level = entry.level.toUpperCase().padEnd(5)
  const reqId = entry.reqId ? `[${entry.reqId}] ` : ''
  const rest = Object.keys(entry)
    .filter((k) => !RESERVED.has(k))
    .map((k) => `${k}=${JSON.stringify(entry[k], makeReplacer())}`)
    .join(' ')
  return `[${time}] ${level} ${reqId}${entry.msg}${rest ? ' ' + rest : ''}`
}

/** Normalise the two supported argument styles into (msg, context). */
function normaliseArgs(
  a: unknown,
  b?: unknown,
): { msg: string; ctx: LogContext } {
  if (typeof a === 'string') {
    return { msg: a, ctx: (b as LogContext) ?? {} }
  }
  const ctx = (a as LogContext) ?? {}
  // Callers commonly pass { err } — keep it, but also lift the message.
  const msg =
    typeof b === 'string'
      ? b
      : typeof (ctx as any).msg === 'string'
        ? String((ctx as any).msg)
        : ''
  return { msg, ctx }
}

function log(level: LogLevel, a: unknown, b?: unknown): void {
  if (LEVEL_MAP[level] < MIN_LEVEL) return
  const { msg, ctx } = normaliseArgs(a, b)
  const entry: LogEntry = {
    level,
    msg,
    ts: Date.now(),
    pid: process.pid,
    v: 1,
    ...ctx,
  }
  process.stdout.write(formatEntry(entry) + '\n')
}

type LogFn = (msgOrCtx: string | LogContext, msgOrCtx2?: string | LogContext) => void

export const logger = {
  fatal: log.bind(null, 'fatal') as LogFn,
  error: log.bind(null, 'error') as LogFn,
  warn: log.bind(null, 'warn') as LogFn,
  info: log.bind(null, 'info') as LogFn,
  debug: log.bind(null, 'debug') as LogFn,
  trace: log.bind(null, 'trace') as LogFn,

  /** Child logger that stamps every line with extra context. */
  child(ctx: LogContext) {
    const bound = (level: LogLevel) => (a: unknown, b?: unknown) => {
      const n = normaliseArgs(a, b)
      log(level, n.msg, { ...ctx, ...n.ctx })
    }
    return {
      fatal: bound('fatal'),
      error: bound('error'),
      warn: bound('warn'),
      info: bound('info'),
      debug: bound('debug'),
      trace: bound('trace'),
    }
  },

  reqId: (): string => randomUUID(),

  withReqId: (reqId: string, msg: string, ctx: LogContext = {}) =>
    log('info', msg, { reqId, ...ctx }),
} as const

/** Alias kept for callers that expect a pino-shaped export. */
export const pinoCompat = logger

export { log }
