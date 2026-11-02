# CEO Helper — Third-Party Platform Integration Implementation Plan

## 1. Own the existing codebase

**Backend (server/)**
- Framework: Bun + Express 5 + TypeScript (module: index.ts, src layout is flattened into server/)
- DB: Prisma 5 + PostgreSQL; models `User`, `IntegrationConnection` (encryptedCredentials, accessToken, refreshToken, tokenExpiry, metadata), `IntegrationData`, `SyncJob`, `IntegrationLog`
- Auth: JWT bearer (user.id/email in payload), express-session + passport for Google, manual GitHub OAuth
- Provider registry: `server/integrations/providers.ts` — 20 providers already registered (salesforce, hubspot, quickbooks, xero, microsoft_dynamics, sap, jira, asana, monday, slack, microsoft_teams, google_calendar, outlook, notion, zoho, airtable, github, mailchimp, google-sheets, trello)
- Controller: `server/controllers/integration.controller.ts` — `startOAuth`, `oauthCallback` (signed state JWT), `saveCredentials`, `disconnectIntegration`, `syncAllIntegrations` (state refresh only), `freeFetchData` (imported rows / internal tasks fallback), `fetchIntegrationData`, `getIntegrationDataForAI`
- Helper: `server/lib/crypto.ts` — AES-256-GCM token/credential encryption

**Frontend (client/)**
- Next.js 14+ app router; `client/app/dashboard/integrations/page.tsx` already wires OAuth start, API-key connect, CSV import, disconnect, and per-provider data tabs
- UI kit: shadcn-style components in `client/components/ui/`

## 2. Confirmed gaps

1. Provider registry missing: `google-drive`, `dropbox`, `stripe`, `paypal` (all have credentials in `server/.env`)
2. `freeFetchData` returns only imported rows or internal tasks — no live provider reads for ANY provider yet
3. Frontend has no data-display cards for live connections
4. `server/.env.example` lacks google-drive / dropbox / stripe / paypal variables
5. No automated tests for the integration layer

## 3. Implementation order (per spec)

- **Phase 1 — Foundation:** provider entries (google-drive, dropbox, stripe, paypal); shared fetcher service (`server/services/integrationFetcher.service.ts`) with pagination + retry + sanitization; controller wiring; frontend data cards; `.env.example` update; setup docs
- **Phase 2 — First working integrations:** Google Sheets, Google Drive, GitHub, Google Calendar, Notion (data fetch + tests)
- **Phase 3 — Business platforms:** HubSpot, Salesforce, Zoho, Airtable, Jira, Asana, Monday.com, Slack (data fetch + tests)
- **Phase 4 — Financial platforms:** QuickBooks, Xero, Stripe, PayPal (data fetch + tests)
- **Phase 5 — Dropbox:** entry + data fetch (spec: deferred until connector configured; here we implement OAuth with public endpoints)
- **Phase 6 — Deferred:** Dynamics 365, Teams, Outlook, Excel, SAP, Mailchimp — catalog only, not implemented

## 4. Rules

- Never print real secrets; redact logs
- OAuth tokens encrypted at rest; never expose to frontend
- OAuth connect requires env vars + successful callback + verified access
- Do NOT mark providers as connected without verified authorization
- Every completed provider gets: provider entry, data fetcher, frontend status, automated tests
- Deferred providers stay catalog entries only; never claimed connected
