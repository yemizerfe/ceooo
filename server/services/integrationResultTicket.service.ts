// server/services/integrationResultTicket.service.ts
//
// After a provider redirects the browser back to us, the outcome is handed to
// the app as a short-lived signed ticket instead of readable query parameters
// (`?oauth=success&provider=xero`). Real-world apps do this so a URL in the
// address bar, a screenshot or a shared link can never be edited to fake a
// connection, and so provider error text never ends up in browser history.
//
// The ticket is signed with JWT_SECRET, expires in five minutes and can only be
// read by this server.

import jwt from 'jsonwebtoken';

export type IntegrationResultStatus = 'success' | 'cancelled' | 'error';

export interface IntegrationResult {
  provider: string;
  status: IntegrationResultStatus;
  reason?: string;
  detail?: string;
}

const PURPOSE = 'integration-result';
const TTL_SECONDS = 5 * 60;

export function issueIntegrationTicket(result: IntegrationResult): string {
  return jwt.sign(
    {
      purpose: PURPOSE,
      provider: result.provider,
      status: result.status,
      ...(result.reason ? { reason: result.reason } : {}),
      ...(result.detail ? { detail: result.detail.slice(0, 200) } : {}),
    },
    process.env.JWT_SECRET!,
    { expiresIn: TTL_SECONDS },
  );
}

/** Returns null for a missing, tampered or expired ticket. */
export function readIntegrationTicket(ticket: string | undefined | null): IntegrationResult | null {
  if (!ticket) return null;

  try {
    const decoded = jwt.verify(ticket, process.env.JWT_SECRET!) as jwt.JwtPayload & {
      purpose?: string;
      provider?: unknown;
      status?: unknown;
      reason?: unknown;
      detail?: unknown;
    };

    if (decoded.purpose !== PURPOSE) return null;
    if (typeof decoded.provider !== 'string' || !decoded.provider) return null;
    if (decoded.status !== 'success' && decoded.status !== 'cancelled' && decoded.status !== 'error') {
      return null;
    }

    return {
      provider: decoded.provider,
      status: decoded.status,
      ...(typeof decoded.reason === 'string' ? { reason: decoded.reason } : {}),
      ...(typeof decoded.detail === 'string' ? { detail: decoded.detail } : {}),
    };
  } catch {
    return null;
  }
}
