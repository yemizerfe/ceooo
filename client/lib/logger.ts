// client/lib/logger.ts
// =============================================================================
// Client-side logging
// =============================================================================
// Browser diagnostics are intentionally quiet in every environment. Errors
// must be surfaced through the UI rather than the developer console.
//
// Never log tokens, credentials, full API payloads or personal data — those
// belong in neither the console nor an error tracker.

export function debugLog(...args: unknown[]): void {
  void args;
}

export function debugWarn(...args: unknown[]): void {
  void args;
}

export function debugError(...args: unknown[]): void {
  void args;
}

/**
 * Redacts values that must never reach a log sink. Use for anything derived
 * from user input before passing it to the helpers above.
 */
export function redact(value: unknown): string {
  if (value == null) return "";
  const text = typeof value === "string" ? value : String(value);
  if (text.includes("@")) {
    const [name, domain] = text.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return text.length > 6 ? `${text.slice(0, 2)}***` : "***";
}
