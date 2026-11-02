# Company-system integrations

Connect the CEO app to the platforms a company already runs on (Salesforce,
HubSpot, QuickBooks, Stripe, Jira, Asana, Monday, Slack, Notion, Zoho, Google
Workspace, GitHub, Trello, Dropbox, …).

## Every platform connects through the vendor

Clicking **Connect** on `/dashboard/integrations` sends the browser to the
vendor's own site, the account owner approves access there, and the vendor
redirects back to the app. Nothing is stored until the user says yes, and the
credential never touches the browser.

| Method | Providers | Flow |
|---|---|---|
| **OAuth 2.0** | HubSpot, Salesforce, Zoho, Jira, Asana, Monday, Notion, Slack, QuickBooks, Stripe (Connect), GitHub, Google Sheets, Google Drive, Google Calendar, Dropbox | `POST /api/integrations/oauth/:provider/start` returns the vendor authorization URL; the callback exchanges the code for access/refresh tokens, stored **encrypted** on `IntegrationConnection`. |
| **OAuth 1.0a** | Trello | Temporary token → `trello.com` “allow access” screen → access token. The temporary token secret is held in an encrypted, HttpOnly cookie, never in the URL. |
| **Personal access token** | Airtable (no consent screen exists) | The user pastes a PAT, or a shared `AIRTABLE_ACCESS_TOKEN` is used. |
| **Server key (no redirect)** | Stripe until `STRIPE_CLIENT_ID` exists | The platform's `STRIPE_SECRET_KEY` is used for a read-only connection. Adding the Connect client id upgrades the card to the redirect flow with no other change. |
| **Key + token** | Trello when its OAuth app is unavailable | `trello.com/app-key` key + token, entered on the card (or `TRELLO_API_KEY` / `TRELLO_TOKEN` on the server). Used automatically when the OAuth handshake answers “App not found”. |
| **CSV / Excel import** | Any system | Upload `.csv` / `.xlsx` / `.xls`; rows land in `IntegrationData` and contact rows also become `Stakeholder` records. |

Access tokens are refreshed automatically (`services/integrationTokens.service.ts`)
a couple of minutes before they expire, so a connection keeps working long after
the original consent instead of quietly returning 401s on the next sync.

Saving credentials always completes the connection — a provider that then rejects
them is reported as a warning on the card rather than hidden behind an
“unconnected” state, so a configured key is never silently ignored.

A connected card always offers **Reconnect**, which reruns the vendor consent
flow and replaces the stored token. Connections saved earlier with an auth
method the provider no longer supports (for example API-key rows for Stripe or
Trello) are reported as `needsReauth` instead of “Connected”, so the only way to
see them as live is to approve access on the vendor's own screen.

## Provider registry

`server/integrations/providers.ts` is the single source of truth: which auth
methods each platform supports, OAuth/OAuth1 endpoints, scopes, and the env-var
names that hold its client credentials. The catalog served to the client
(`serializeProvider`) reports `oauthConfigured`, `oauthFlavor` and
`supportsRedirectAuth`, which is what the page uses to decide between redirecting
and explaining which variable is missing.

## Environment variables

- `INTEGRATIONS_REDIRECT_BASE` — public base URL providers redirect back to
  (defaults to `http://localhost:$PORT`). The default callback is
  `{base}/api/integrations/<provider>/callback`. Set the provider-specific
  `<PROVIDER>_REDIRECT_URI` variable when the vendor console has a different
  callback registered. The legacy `/api/v1/integrations/:provider/callback`
  path stays mounted for apps already registered with that URL.
- `INTEGRATION_ENCRYPTION_KEY` — AES-256-GCM key for credentials at rest
  (falls back to `JWT_SECRET`).
- Per-provider OAuth pairs — `HUBSPOT_CLIENT_ID`/`HUBSPOT_CLIENT_SECRET`,
  `SALESFORCE_CLIENT_ID`/`SALESFORCE_CLIENT_SECRET`, … See `.env.example` for the
  full list and the callback URL to register for each app.
- Trello uses its OAuth 1.0a consumer key/secret, exposed in the console as a
  Power-Up's **API key** and **secret**: `TRELLO_CLIENT_ID` /
  `TRELLO_CLIENT_SECRET`.
- Stripe uses Connect: `STRIPE_CLIENT_ID` is the `ca_...` client id and
  `STRIPE_SECRET_KEY` is the platform secret key used for the exchange.
- Google Sheets, Drive and Calendar each need their own OAuth client and all
  three redirect to `GOOGLE_CALLBACK_URL`. The Google callback dispatches signed
  integration state to the matching handler, and still serves normal Google
  sign-in callbacks.
- Salesforce accepts `SALESFORCE_REDIRECT_URI` or the legacy
  `SALESFORCE_CALLBACK_URL` for its exact registered callback.
- `AIRTABLE_ACCESS_TOKEN` enables the shared server token for Airtable.
- Any provider can have its scopes narrowed for a specific console without a
  code change: `<PROVIDER>_SCOPES` (whitespace or comma separated).

A provider whose client credentials are missing still works through CSV import;
the page names the exact variables to set instead of starting a flow that would
fail at the vendor.

## Endpoints

```
GET    /api/integrations                        catalog + per-user status
POST   /api/integrations/oauth/:provider/start  -> vendor authorization URL
GET    /api/integrations/oauth/:provider/callback (public, state-signed)
GET    /api/integrations/:provider/callback       (public callback, state-signed)
POST   /api/integrations/oauth/result           exchange the short-lived ticket
POST   /api/integrations/credentials            save an Airtable PAT
POST   /api/integrations/import                 CSV/Excel (multipart `file`)
POST   /api/integrations/disconnect   (removes the connection, the saved state and every
                                       `sync:<provider>:*` / `import:<provider>:*` row)
POST   /api/integrations/sync                   fetch + persist provider data
GET    /api/integrations/:appName/data
```
