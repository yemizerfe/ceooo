import type { Request, Response } from 'express';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { IntegrationType } from '@prisma/client';
import {
  getConfiguredApiCredentials,
  getProvider,
  oauth1Credentials,
  PROVIDERS,
  providerClientId,
  providerClientSecret,
  serializeProvider,
  resolveOAuth1Urls,
  resolveOAuthUrls,
  type Provider,
} from '../integrations/providers.js';
import {
  oauth1AccessToken,
  oauth1AuthorizeUrl,
  oauth1RequestToken,
} from '../integrations/oauth1.js';
import { frontendUrl, oauthRedirectUri, safeFrontendReturnTo } from './integration.helpers.js';
import { fetchProviderData, type FetchOptions } from '../services/integrationFetcher.service.js';
import {
  issueIntegrationTicket,
  type IntegrationResultStatus,
} from '../services/integrationResultTicket.service.js';
import { fetchAllProviderSnapshots } from '../services/integrationSnapshot.service.js';
import { loadFreshConnection } from '../services/integrationTokens.service.js';
import { encryptSecret, decryptSecret, encryptCredentials, readCredentialBlob } from '../lib/crypto.js';
import {
  parseTabularFile,
  suggestMapping,
  guessRecordType,
  mapContacts,
  previewRows,
  RECORD_TYPES,
  type RecordType,
  type SuggestedMapping,
} from '../services/integrationImport.service.js';

const IMPORT_CHUNK_SIZE = 500;
const OAUTH1_COOKIE_PREFIX = 'ceooo.oauth1.';
const OAUTH1_PENDING_TTL_MS = 10 * 60 * 1000;

/** What the encrypted, HttpOnly cookie carries between consent steps. */
interface OAuth1PendingState {
  userId?: string;
  returnTo?: string;
  token?: string;
  secret?: string;
}

function oauth1CookieName(providerId: string): string {
  return `${OAUTH1_COOKIE_PREFIX}${providerId}`;
}

/** Reads one cookie value without pulling in a parser dependency. */
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
  }
  return null;
}

function pkceVerifier(providerId: string, userId: string, nonce: string): string {
  return createHmac('sha256', process.env.JWT_SECRET!)
    .update(`${providerId}:${userId}:${nonce}`)
    .digest('base64url');
}

export class IntegrationController {
  // `User.integrations` is a Json column, but legacy rows stored a
  // JSON-encoded *string*. Prisma then hands back a string, and assigning into
  // a string index throws "Attempted to assign to readonly property."
  // Always normalize to a fresh, mutable plain object.
  private readIntegrations(raw: unknown): Record<string, any> {
    let parsed: any = raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed || '{}');
      } catch {
        parsed = {};
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return { ...parsed };
  }

  private async loadState(userId: string): Promise<Record<string, any>> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { integrations: true } });
    return this.readIntegrations(user?.integrations);
  }

  private async saveState(userId: string, state: Record<string, any>) {
    await prisma.user.update({ where: { id: userId }, data: { integrations: state } });
  }

  // ==================== CATALOG + STATUS ====================

  // Get all providers with the auth methods each supports and this user's
  // connection status.
  async getIntegrations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const state = await this.loadState(userId);
      const [connections, dataRows] = await Promise.all([
        prisma.integrationConnection.findMany({ where: { userId } }),
        prisma.integrationData.findMany({
          where: {
            userId,
            OR: [{ source: { startsWith: 'sync:' } }, { source: { startsWith: 'import:' } }],
          },
          select: { source: true, data: true },
        }),
      ]);
      const byName = new Map(connections.map((c) => [c.name, c]));

      // Persisted record counts per provider (live syncs + CSV imports) so the
      // integrations page reflects what pages and AI actually receive.
      const recordCounts = new Map<string, number>();
      for (const row of dataRows as any[]) {
        const providerId = String(row.source || '').split(':')[1];
        if (!providerId) continue;
        const rows = Array.isArray(row.data?.items)
          ? row.data.items.length
          : Array.isArray(row.data?.rows)
            ? row.data.rows.length
            : 0;
        recordCounts.set(providerId, (recordCounts.get(providerId) || 0) + rows);
      }

      const integrations = PROVIDERS
        .map((provider) => {
        const s = this.readIntegrations(state[provider.id]);
        const conn = byName.get(provider.id);
        const persisted = recordCounts.get(provider.id) || 0;
        // A connection written by an auth method the provider no longer
        // supports (older API-key connections for OAuth-only apps) cannot be
        // trusted — the account owner never approved access on the vendor's
        // consent screen. Ask them to reconnect instead of showing it as live.
        const storedMethod = s.method || conn?.authMethod || null;
        const storedMethodSupported = !storedMethod || provider.authMethods.includes(storedMethod);
        const needsReauth =
          Boolean(conn || s.connected) &&
          (provider.oauth || provider.oauth1) !== undefined &&
          !storedMethodSupported;
        return {
          ...serializeProvider(provider),
          connected: Boolean(s.connected || (conn && conn.status === 'CONNECTED')) && !needsReauth,
          method: s.method || conn?.authMethod || null,
          needsReauth,
          accountName: s.accountName || conn?.appId || null,
          connectionId: conn?.connectionId || null,
          connectedAt: s.connectedAt || conn?.connectedAt || null,
          lastSync: s.lastSync || conn?.lastSyncAt?.toISOString() || null,
          recordsImported: Math.max(s.recordsImported || 0, persisted),
          importRecordType: s.importRecordType || null,
          lastError:
            s.lastError ||
            (conn?.lastSyncStatus === 'error' ? 'Last sync failed — check credentials' : null),
        };
      });

      res.json({
        success: true,
        data: {
          integrations,
          recordTypes: RECORD_TYPES,
          count: integrations.length,
          connectedCount: integrations.filter((i) => i.connected).length,
        },
      });
    } catch (error) {
      console.error('Failed to get integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get integrations',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== OAUTH 2.0 ====================

  // Begin the authorization-code flow: returns the URL the browser must visit.
  async startOAuth(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const providerId = String(req.params.provider);
      const provider = getProvider(providerId);
      // Trello never shipped OAuth 2.0; its three-legged OAuth 1.0a handshake
      // still sends the user to trello.com to approve the app.
      if (provider?.oauth1) return this.startOAuth1(req, res, provider);
      if (!provider?.oauth) {
        return res.status(400).json({
          success: false,
          message: provider
            ? `${provider.name} connects with an access token, not a redirect (use the token form).`
            : `Unknown provider: ${providerId}`,
        });
      }

      const clientId = providerClientId(provider);
      const clientSecret = providerClientSecret(provider);
      if (!clientId || !clientSecret) {
        const missing = [!clientId && provider.oauth.clientIdEnv, !clientSecret && provider.oauth.clientSecretEnv]
          .filter(Boolean)
          .join(' and ');
        return res.status(400).json({
          success: false,
          code: 'OAUTH_NOT_CONFIGURED',
          message: `OAuth for ${provider.name} is not configured. Set ${missing} in the server environment.`,
        });
      }

      const pkceNonce = provider.oauth.usePkce ? randomBytes(32).toString('base64url') : undefined;
      const returnTo = safeFrontendReturnTo(req.body?.returnTo);
      const state = jwt.sign(
        {
          userId,
          provider: provider.id,
          purpose: 'integration-oauth',
          returnTo,
          ...(pkceNonce ? { pkceNonce } : {}),
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' },
      );

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: oauthRedirectUri(provider),
        response_type: 'code',
        state,
      });
      if (provider.oauth.skipRedirectUri) {
        params.delete('redirect_uri');
      }
      if ((provider.oauth as any).usePkce && pkceNonce) {
        const verifier = pkceVerifier(provider.id, userId, pkceNonce);
        const challenge = createHash('sha256').update(verifier).digest('base64url');
        params.set('code_challenge', challenge);
        params.set('code_challenge_method', 'S256');
      }
      // Zoho and Slack require comma-delimited scopes; everyone else expects
      // space-delimited. An env override lets a deployment match the scopes
      // enabled on its OAuth app without a code change.
      const scopeEnvKey = `${provider.id.toUpperCase().replace(/-/g, '_')}_SCOPES`;
      const scopes = process.env[scopeEnvKey]
        ? process.env[scopeEnvKey]!.split(/[\s,]+/).filter(Boolean)
        : provider.oauth.scopes;
      if (scopes.length) {
        params.set('scope', scopes.join(provider.id === 'slack' || provider.id === 'zoho' ? ',' : ' '));
      }
      for (const [k, v] of Object.entries(provider.oauth.extraAuthParams || {})) params.set(k, v);

      const urls = resolveOAuthUrls(provider)!;
      res.json({
        success: true,
        data: {
          authorizationUrl: `${urls.authorizeUrl}?${params.toString()}`,
          provider: provider.id,
        },
      });
    } catch (error) {
      console.error('OAuth start failed:', error);
      res.status(500).json({ success: false, message: 'Failed to start OAuth flow' });
    }
  }

  /**
   * OAuth 1.0a, step 1: obtain a temporary token and return the vendor URL that
   * shows its “allow access to this app?” screen. The temporary token secret
   * is kept in an encrypted, HttpOnly cookie — never in the URL the browser
   * jumps to.
   */
  private async startOAuth1(req: Request, res: Response, provider: Provider) {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const config = provider.oauth1!;
    const consumer = oauth1Credentials(provider);
    const urls = resolveOAuth1Urls(provider);
    if (!consumer || !urls) {
      return res.status(400).json({
        success: false,
        code: 'OAUTH_NOT_CONFIGURED',
        message: `OAuth for ${provider.name} is not configured. Set ${config.consumerKeyEnv} and ${config.consumerSecretEnv} in the server environment.`,
      });
    }

    try {
      const returnTo = safeFrontendReturnTo(req.body?.returnTo);
      const temporary = await oauth1RequestToken(
        urls.requestTokenUrl,
        consumer,
        oauthRedirectUri(provider),
      );
      const pending = encryptSecret(
        JSON.stringify({
          userId,
          returnTo,
          token: temporary.token,
          secret: temporary.secret,
        }),
      );
      res.cookie(oauth1CookieName(provider.id), pending, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: OAUTH1_PENDING_TTL_MS,
      });
      return res.json({
        success: true,
        data: {
          authorizationUrl: oauth1AuthorizeUrl(urls.authorizeUrl, temporary.token, {
            appName: config.appName,
            scope: config.scope,
            expiration: config.expiration,
          }),
          provider: provider.id,
        },
      });
    } catch (error) {
      console.error(`OAuth 1.0a start failed for ${provider.id}:`, error);
      const vendor = error instanceof Error ? error.message : '';
      return res.status(502).json({
        success: false,
        message:
          `${provider.name} did not open its consent screen` +
          (vendor ? ` (${vendor}).` : '.') +
          ` Check that ${config.consumerKeyEnv} belongs to a live app and that ${oauthRedirectUri(provider)} is registered on it.`,
      });
    }
  }

  /** OAuth 1.0a, steps 2–3: verify the browser, collect the user token, store it. */
  private async finishOAuth1(req: Request, res: Response, provider: Provider) {
    const cookieName = oauth1CookieName(provider.id);
    const rawCookie = readCookie(req, cookieName);
    res.clearCookie(cookieName, { path: '/' });

    const pending = ((): OAuth1PendingState | null => {
      if (!rawCookie) return null;
      try {
        const json = decryptSecret(rawCookie);
        return json ? (JSON.parse(json) as OAuth1PendingState) : null;
      } catch {
        return null;
      }
    })();

    const finish = (
      status: IntegrationResultStatus,
      reason?: string,
      detail?: string,
    ) => {
      const destination = new URL(
        safeFrontendReturnTo(pending?.returnTo),
        frontendUrl(),
      );
      destination.searchParams.set(
        'integration',
        issueIntegrationTicket({
          provider: provider.id,
          status,
          ...(reason ? { reason } : {}),
          ...(detail ? { detail } : {}),
        }),
      );
      return res.redirect(destination.toString());
    };

    const config = provider.oauth1!;
    const consumer = oauth1Credentials(provider);
    const urls = resolveOAuth1Urls(provider);
    if (!consumer || !urls) return finish('error', 'not_configured');
    if (!pending?.userId || !pending.token) return finish('error', 'state_expired');

    const query = req.query as Record<string, string>;
    // No token back means the user closed or declined the consent screen.
    if (!query.oauth_token) return finish('cancelled');
    if (query.oauth_token !== pending.token) return finish('error', 'state_mismatch');
    if (!query.oauth_verifier) return finish('cancelled');

    let access: { token: string; secret: string };
    try {
      access = await oauth1AccessToken(
        urls.accessTokenUrl,
        consumer,
        { token: pending.token, secret: pending.secret || '' },
        query.oauth_verifier,
      );
    } catch (error) {
      console.error(`OAuth 1.0a token exchange failed for ${provider.id}:`, error);
      return finish('error', 'token_exchange_failed');
    }

    // Best-effort account label so the UI can say which workspace is connected.
    let accountName: string | null = null;
    if (provider.id === 'trello') {
      try {
        const meRes = await fetch(
          `https://api.trello.com/1/members/me?key=${encodeURIComponent(consumer.consumerKey)}&token=${encodeURIComponent(access.token)}`,
          { headers: { Accept: 'application/json' } },
        );
        if (meRes.ok) {
          const me: any = await meRes.json();
          accountName = typeof me?.username === 'string' ? me.username : null;
        }
      } catch {
        /* the connection is still valid without a display name */
      }
    }

    const userId = pending.userId;
    const existing = await prisma.integrationConnection.findUnique({
      where: { userId_name: { userId, name: provider.id } },
    });
    const metadata = {
      accountName,
      authMethod: 'oauth1',
      // Trello’s API authenticates with the app key plus the user token; the
      // key is public, the token is encrypted in accessToken.
      apiKey: consumer.consumerKey,
    };

    await prisma.integrationConnection.upsert({
      where: { userId_name: { userId, name: provider.id } },
      create: {
        userId,
        name: provider.id,
        type: provider.integrationType as IntegrationType,
        status: 'CONNECTED',
        authMethod: 'oauth1',
        accessToken: encryptSecret(access.token),
        // The OAuth 1.0a token secret is needed for signed calls, so it is kept
        // encrypted alongside the token.
        refreshToken: access.secret ? encryptSecret(access.secret) : null,
        connectionId: existing?.connectionId || `oauth1_${provider.id}_${Date.now().toString(36)}`,
        appId: accountName,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        lastSyncStatus: 'connected',
        metadata,
      },
      update: {
        type: provider.integrationType as IntegrationType,
        status: 'CONNECTED',
        authMethod: 'oauth1',
        accessToken: encryptSecret(access.token),
        refreshToken: access.secret ? encryptSecret(access.secret) : undefined,
        appId: accountName ?? undefined,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        lastSyncStatus: 'connected',
        metadata,
      },
    });

    const stateMap = await this.loadState(userId);
    stateMap[provider.id] = {
      ...this.readIntegrations(stateMap[provider.id]),
      connected: true,
      method: 'oauth1',
      accountName: accountName || provider.name,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      lastError: null,
    };
    await this.saveState(userId, stateMap);

    return finish('success');
  }

  // OAuth redirect target. Not behind the bearer-auth middleware — the user is
  // identified by the signed `state` param instead.
  async oauthCallback(req: Request, res: Response) {
    const providerId = String(req.params.provider);
    const provider = getProvider(providerId);
    let returnTo = '/dashboard/integrations';
    // The outcome travels as a short-lived signed ticket, never as readable
    // `oauth=…&provider=…&reason=…` parameters: the URL stays opaque, cannot be
    // forged, and provider error text stays out of browser history.
    const redirect = (result: {
      status: IntegrationResultStatus;
      reason?: string;
      detail?: string;
    }) => {
      const destination = new URL(returnTo, frontendUrl());
      destination.searchParams.set(
        'integration',
        issueIntegrationTicket({ provider: providerId, ...result }),
      );
      return res.redirect(destination.toString());
    };

    try {
      if (provider?.oauth1) {
        return await this.finishOAuth1(req, res, provider);
      }
      if (!provider?.oauth) {
        return redirect({ status: 'error', reason: 'unsupported' });
      }

      const { code, state, error: oauthError } = req.query as Record<string, string>;
      let decoded: {
        userId?: string;
        provider?: string;
        purpose?: string;
        pkceNonce?: string;
        returnTo?: string;
      };
      try {
        decoded = typeof state === 'string'
          ? jwt.verify(state, process.env.JWT_SECRET!) as typeof decoded
          : {};
      } catch (error) {
        const reason = error instanceof jwt.TokenExpiredError ? 'state_expired' : 'invalid_state';
        console.warn(`OAuth state verification failed for ${provider.id}: ${reason}`);
        return redirect({ status: 'error', reason });
      }
      if (
        !decoded.userId ||
        decoded.purpose !== 'integration-oauth' ||
        decoded.provider !== provider.id
      ) {
        console.warn(`OAuth state claims did not match callback for ${provider.id}`);
        return redirect({ status: 'error', reason: 'state_mismatch' });
      }
      returnTo = safeFrontendReturnTo(decoded.returnTo);
      if (oauthError) {
        // Declining the consent screen is a normal user choice, not a failure:
        // report it neutrally so the page can confirm nothing changed.
        const cancelled = oauthError === 'access_denied' || oauthError === 'consent_required';
        if (cancelled) {
          return redirect({ status: 'cancelled' });
        }
        return redirect({ status: 'error', reason: oauthError });
      }
      if (!code) {
        return redirect({ status: 'error', reason: 'missing_code' });
      }

      const clientId = providerClientId(provider)!;
      const clientSecret = providerClientSecret(provider)!;
      const oauthExt = provider.oauth as any;
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        ...(provider.oauth.skipRedirectUri ? {} : { redirect_uri: oauthRedirectUri(provider) }),
        ...(oauthExt.extraTokenParams || {}),
      });
      if (oauthExt.usePkce) {
        if (!decoded.pkceNonce) {
          console.warn(`OAuth state is missing its PKCE nonce for ${provider.id}`);
          return redirect({ status: 'error', reason: 'invalid_state' });
        }
        body.set('code_verifier', pkceVerifier(provider.id, decoded.userId!, decoded.pkceNonce));
      }
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (oauthExt.useBasicAuth) {
        headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
      } else {
        body.set('client_id', clientId);
        body.set('client_secret', clientSecret);
      }

      const oauthUrls = resolveOAuthUrls(provider)!;
      const tokenRequestHeaders = {
        ...headers,
        'Content-Type': oauthExt.useJsonTokenRequest
          ? 'application/json'
          : 'application/x-www-form-urlencoded',
      };
      const tokenRes = await fetch(oauthUrls.tokenUrl, {
        method: 'POST',
        headers: tokenRequestHeaders,
        body: oauthExt.useJsonTokenRequest
          ? JSON.stringify(Object.fromEntries(body))
          : body.toString(),
      });
      const tokenJson: any = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || (!tokenJson.access_token && !tokenJson.ok)) {
        console.error(`OAuth token exchange failed for ${provider.id}:`, tokenRes.status, tokenJson);
        // Surface the provider's own wording (e.g. Zoho's "invalid_client") so
        // the integrations page can tell the user exactly which console setting
        // to fix.
        const providerDetail = String(
          tokenJson.error_description || tokenJson.error || tokenJson.message || '',
        ).slice(0, 200);
        return redirect({
          status: 'error',
          reason: 'token_exchange_failed',
          ...(providerDetail ? { detail: providerDetail } : {}),
        });
      }

      const accessToken = tokenJson.access_token as string;
      const refreshToken = (tokenJson.refresh_token as string) || null;
      const expiresIn = Number(tokenJson.expires_in) || null;
      let jiraResource: { cloudId: string; name: string | null } | null = null;
      if (provider.id === 'jira') {
        const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        });
        if (!resourcesRes.ok) {
          console.error('Jira accessible-resource lookup failed:', resourcesRes.status);
          return redirect({ status: 'error', reason: 'site_lookup_failed' });
        }
        const resources: unknown = await resourcesRes.json();
        const firstResource = Array.isArray(resources)
          ? resources.find(
              (resource): resource is { id: string; name?: string } =>
                Boolean(
                  resource &&
                    typeof resource === 'object' &&
                    typeof resource.id === 'string' &&
                    resource.id,
                ),
            )
          : undefined;
        if (!firstResource) {
          console.warn('Jira authorization returned no accessible sites');
          return redirect({ status: 'error', reason: 'site_not_found' });
        }
        jiraResource = {
          cloudId: firstResource.id,
          name: typeof firstResource.name === 'string' ? firstResource.name : null,
        };
      }
      // QuickBooks returns the company id on the redirect query string, not in
      // the token payload — every Accounting API call needs it.
      const realmId =
        typeof req.query.realmId === 'string'
          ? req.query.realmId
          : typeof req.query.realm_id === 'string'
            ? (req.query.realm_id as string)
            : null;
      // Stripe Connect identifies the connected account by `stripe_user_id`.
      const stripeUserId =
        typeof tokenJson.stripe_user_id === 'string' ? tokenJson.stripe_user_id : null;

      const accountName =
        stripeUserId ||
        jiraResource?.name ||
        tokenJson.team?.name ||
        tokenJson.hub_domain ||
        tokenJson.instance_url ||
        tokenJson.authed_user?.id ||
        realmId ||
        null;
      const connectionMetadata = {
        accountName,
        scope: tokenJson.scope ?? null,
        authMethod: 'oauth2',
        instanceUrl: typeof tokenJson.instance_url === 'string' ? tokenJson.instance_url : null,
        baseUrl: typeof tokenJson.instance_url === 'string' ? tokenJson.instance_url : null,
        // Zoho returns the data-centre base URL (.com/.eu/.in/.com.au) with the
        // token; CRM calls must target that domain or they 401.
        apiDomain: typeof tokenJson.api_domain === 'string' ? tokenJson.api_domain : null,
        ...(jiraResource ? { cloudId: jiraResource.cloudId } : {}),
        ...(realmId ? { realm_id: realmId, realmId } : {}),
        ...(stripeUserId ? { stripeUserId } : {}),
      };

      const userId = decoded.userId;
      const existing = await prisma.integrationConnection.findUnique({
        where: { userId_name: { userId, name: provider.id } },
      });

      await prisma.integrationConnection.upsert({
        where: { userId_name: { userId, name: provider.id } },
        create: {
          userId,
          name: provider.id,
          type: provider.integrationType as IntegrationType,
          status: 'CONNECTED',
          authMethod: 'oauth2',
          accessToken: encryptSecret(accessToken),
          refreshToken: refreshToken ? encryptSecret(refreshToken) : null,
          tokenExpiry: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
          connectionId: existing?.connectionId || `oauth_${provider.id}_${Date.now().toString(36)}`,
          appId: typeof accountName === 'string' ? accountName : null,
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          lastSyncStatus: 'connected',
          metadata: connectionMetadata,
        },
        update: {
          type: provider.integrationType as IntegrationType,
          status: 'CONNECTED',
          authMethod: 'oauth2',
          accessToken: encryptSecret(accessToken),
          refreshToken: refreshToken ? encryptSecret(refreshToken) : undefined,
          tokenExpiry: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
          appId: typeof accountName === 'string' ? accountName : undefined,
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          lastSyncStatus: 'connected',
          metadata: connectionMetadata,
        },
      });

      const stateMap = await this.loadState(userId);
      stateMap[provider.id] = {
        ...this.readIntegrations(stateMap[provider.id]),
        connected: true,
        method: 'oauth2',
        accountName: typeof accountName === 'string' ? accountName : provider.name,
        connectedAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        lastError: null,
      };
      await this.saveState(userId, stateMap);

      return redirect({ status: 'success' });
    } catch (error) {
      console.error('OAuth callback failed:', error);
      return redirect({ status: 'error', reason: 'server_error' });
    }
  }

  // ==================== API KEY / ACCESS TOKEN ====================

  async saveCredentials(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { provider: providerId, credentials: submittedCredentials, source } = req.body || {};
      const provider = getProvider(providerId);
      if (!provider?.apiKey) {
        return res.status(400).json({ success: false, message: `API key connection is not supported for ${providerId}` });
      }
      // 'server' means "use the credentials already in the environment"; any
      // other value (the UI sends 'user') means the request body carries them.
      if (source !== undefined && source !== 'server' && source !== 'user') {
        return res.status(400).json({ success: false, message: 'Unsupported credential source' });
      }

      const credentials = source === 'server' ? getConfiguredApiCredentials(provider) : submittedCredentials;
      if (!credentials || typeof credentials !== 'object') {
        if (source === 'server') {
          return res.status(400).json({ success: false, message: `No server credentials are configured for ${provider.name}` });
        }
        return res.status(400).json({ success: false, message: 'Credentials are required' });
      }

      // Validate required fields.
      const missing = provider.apiKey.fields
        .filter((f) => f.required && !String(credentials[f.key] ?? '').trim())
        .map((f) => f.label);
      if (missing.length) {
        return res.status(400).json({ success: false, message: `Missing required field(s): ${missing.join(', ')}` });
      }

      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(credentials)) {
        const value = String(v ?? '').trim();
        if (value) clean[k] = value;
      }

      // Best-effort live verification (never blocks storing the credentials).
      let verified: boolean | null = null;
      let verifyMessage: string | null = null;
      if (provider.apiKey.test) {
        try {
          const { url, headers } = provider.apiKey.test(clean);
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 8000);
          const check = await fetch(url, { headers, signal: ctrl.signal });
          clearTimeout(timer);
          verified = check.ok;
          if (check.ok) {
            verifyMessage = 'Credentials verified';
          } else {
            // Providers put the actionable reason in the body (Airtable answers
            // 401 with a specific message for a revoked PAT). Surface it so the
            // user knows which credential to replace.
            const bodyText = await check.text().catch(() => '');
            const snippet = bodyText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
            verifyMessage = `Provider returned HTTP ${check.status}${snippet ? `: ${snippet}` : ''}`;
            if (provider.id === 'airtable' && /unauthorized|invalid|token/i.test(snippet + check.status)) {
              verifyMessage +=
                ' — Airtable rejected that token. Create a new personal access token at airtable.com/create/tokens with the bases you want to read.';
            }
          }
        } catch (e) {
          verified = false;
          verifyMessage = 'Could not reach the provider to verify (credentials were saved)';
        }
      }

      const accountName =
        clean.accountName ||
        clean.instanceUrl ||
        clean.baseUrl ||
        clean.hubDomain ||
        clean.email ||
        provider.name;

      // Values are encrypted individually; the blob itself is plain JSON so the
      // reader only has to peel one layer.
      const encrypted = JSON.stringify(encryptCredentials(clean));

      await prisma.integrationConnection.upsert({
        where: { userId_name: { userId, name: provider.id } },
        create: {
          userId,
          name: provider.id,
          type: provider.integrationType as IntegrationType,
          status: 'CONNECTED',
          authMethod: 'apiKey',
          encryptedCredentials: encrypted,
          connectionId: `key_${provider.id}_${Date.now().toString(36)}`,
          appId: accountName,
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          lastSyncStatus: verified === false ? 'unverified' : 'connected',
          metadata: { accountName, fieldKeys: Object.keys(clean), verified: verified ?? 'unchecked', verifyMessage },
        },
        update: {
        type: provider.integrationType as IntegrationType,
        status: 'CONNECTED',
        authMethod: 'apiKey',
        encryptedCredentials: encrypted,
        appId: accountName,
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          lastSyncStatus: verified === false ? 'unverified' : 'connected',
          metadata: { accountName, fieldKeys: Object.keys(clean), verified: verified ?? 'unchecked', verifyMessage },
        },
      });

      const stateMap = await this.loadState(userId);
      stateMap[provider.id] = {
        ...this.readIntegrations(stateMap[provider.id]),
        // Saving the credential completes the connection. A failed live check is
        // recorded as a warning (shown on the card) instead of leaving the
        // provider looking unconnected when its key is already configured.
        connected: true,
        method: 'apiKey',
        accountName,
        connectedAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        lastError: verified === false ? verifyMessage || 'The provider rejected these credentials.' : null,
      };
      await this.saveState(userId, stateMap);

      res.json({
        success: true,
        data: { provider: provider.id, method: 'apiKey', accountName, verified, verifyMessage },
        message: verified === false ? 'Connected. Credentials saved but could not be verified.' : `Connected to ${provider.name}`,
      });
    } catch (error) {
      console.error('Save credentials failed:', error);
      res.status(500).json({ success: false, message: 'Failed to save credentials' });
    }
  }

  // ==================== CSV / EXCEL IMPORT ====================

  async importIntegrationFile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const file = (req as any).file as { buffer: Buffer; originalname: string; size: number } | undefined;
      if (!file?.buffer?.length) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const providerId = (req.body?.provider as string) || 'csv-import';
      const provider = getProvider(providerId);
      const sheet = req.body?.sheet as string | undefined;
      const preview = String(req.body?.preview ?? '') === 'true' || String(req.query?.preview ?? '') === 'true';

      let table;
      try {
        table = parseTabularFile(file.buffer, sheet);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: parseError instanceof Error ? parseError.message : 'Could not read the file',
        });
      }

      const guessed = guessRecordType(table.columns);
      const recordType: RecordType = (req.body?.recordType as RecordType) || guessed;
      const mapping: SuggestedMapping =
        typeof req.body?.mapping === 'string' && req.body.mapping
          ? JSON.parse(req.body.mapping)
          : req.body?.mapping && typeof req.body.mapping === 'object'
            ? req.body.mapping
            : suggestMapping(table.columns, recordType);

      if (preview) {
        return res.json({
          success: true,
          data: {
            fileName: file.originalname,
            sheetName: table.sheetName,
            sheetNames: table.sheetNames,
            columns: table.columns,
            rowCount: table.rows.length,
            sampleRows: previewRows(table.rows, 20),
            guessedRecordType: guessed,
            recordType,
            suggestedMapping: mapping,
          },
        });
      }

      if (!table.rows.length) {
        return res.status(400).json({ success: false, message: 'The file contains no data rows' });
      }

      // Persist the raw rows (chunked) so the AI and downstream features can use them.
      const source = `import:${providerId}:${recordType}`;
      let stored = 0;
      for (let i = 0; i < table.rows.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = table.rows.slice(i, i + IMPORT_CHUNK_SIZE);
        await prisma.integrationData.create({
          data: {
            userId,
            source,
            data: { rows: chunk } as any,
            metadata: {
              provider: providerId,
              recordType,
              columns: table.columns,
              fileName: file.originalname,
              sheetName: table.sheetName,
              chunkStart: i,
              chunkSize: chunk.length,
              mapping,
              importedAt: new Date().toISOString(),
            } as any,
          },
        });
        stored += chunk.length;
      }

      // Contacts become real stakeholders.
      let stakeholders = 0;
      if (recordType === 'contacts') {
        const drafts = mapContacts(table.rows, mapping);
        if (drafts.length) {
          await prisma.stakeholder.createMany({
            data: drafts.map((d) => ({
              userId,
              name: d.name,
              email: d.email,
              phone: d.phone,
              company: d.company,
              role: d.role,
              type: d.type,
              notes: d.notes,
            })),
          });
          stakeholders = drafts.length;
        }
      }

      const targetId = provider ? provider.id : 'csv-import';
      const existing = await prisma.integrationConnection.findUnique({
        where: { userId_name: { userId, name: targetId } },
      });
      await prisma.integrationConnection.upsert({
        where: { userId_name: { userId, name: targetId } },
        create: {
          userId,
          name: targetId,
          type: provider?.integrationType as IntegrationType ?? 'OTHER',
          status: 'CONNECTED',
          authMethod: 'csv',
          connectionId: `import_${targetId}_${Date.now().toString(36)}`,
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          lastSyncStatus: 'imported',
          metadata: { fileName: file.originalname, recordType, rows: stored, stakeholders, columns: table.columns },
        },
        update: {
          status: 'CONNECTED',
          authMethod: 'csv',
          lastSyncAt: new Date(),
          lastSyncStatus: 'imported',
          metadata: { fileName: file.originalname, recordType, rows: stored, stakeholders, columns: table.columns },
        },
      });

      const stateMap = await this.loadState(userId);
      const prev = this.readIntegrations(stateMap[targetId]);
      stateMap[targetId] = {
        ...prev,
        connected: true,
        method: 'csv',
        accountName: prev.accountName || `${file.originalname}`,
        connectedAt: prev.connectedAt || new Date().toISOString(),
        lastSync: new Date().toISOString(),
        recordsImported: (prev.recordsImported || 0) + stored,
        importRecordType: recordType,
        lastError: null,
      };
      await this.saveState(userId, stateMap);

      res.json({
        success: true,
        data: {
          provider: targetId,
          fileName: file.originalname,
          sheetName: table.sheetName,
          recordType,
          columns: table.columns,
          rowsImported: stored,
          stakeholdersCreated: stakeholders,
          sampleRows: previewRows(table.rows, 5),
        },
        message:
          recordType === 'contacts'
            ? `Imported ${stored} rows and created ${stakeholders} stakeholders`
            : `Imported ${stored} rows`,
      });
    } catch (error) {
      console.error('Integration import failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import file',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== CONNECT (method-aware) ====================

  // Legacy entrypoint kept for backward compatibility: now reports the auth
  // methods available for a provider instead of faking a connection.
  async connectIntegration(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { appName } = req.body || {};
      const provider = getProvider(appName);
      if (!provider) {
        return res.status(404).json({ success: false, message: `Unknown integration: ${appName}` });
      }

      res.status(400).json({
        success: false,
        code: 'METHOD_REQUIRED',
        message: `${provider.name} requires a connection method. Choose OAuth, an API key, or a CSV/Excel import.`,
        data: { provider: serializeProvider(provider) },
      });
    } catch (error) {
      console.error('Connect failed:', error);
      res.status(500).json({ success: false, message: 'Failed to connect to integration' });
    }
  }

  async disconnectIntegration(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { appName } = req.body;

      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      if (!appName) return res.status(400).json({ success: false, message: 'App name is required' });

      await prisma.integrationConnection
        .delete({ where: { userId_name: { userId, name: appName } } })
        .catch(() => null);

      // Disconnecting is not just "forget the token": everything pulled from
      // that platform (synced datasets and imported rows) leaves with it, so no
      // stale records keep feeding the pages or the AI context.
      const names = new Set([
        String(appName),
        String(appName).replace(/-/g, '_'),
        String(appName).replace(/_/g, '-'),
      ]);
      const removed = await prisma.integrationData.deleteMany({
        where: {
          userId,
          OR: [...names].flatMap((name) => [
            { source: { startsWith: `sync:${name}:` } },
            { source: { startsWith: `import:${name}:` } },
          ]),
        },
      });

      const stateMap = await this.loadState(userId);
      delete stateMap[appName];
      await this.saveState(userId, stateMap);

      res.json({
        success: true,
        message:
          removed.count > 0
            ? `Disconnected from ${appName} and removed ${removed.count} stored record${removed.count === 1 ? '' : 's'}`
            : `Disconnected from ${appName}`,
        data: { recordsRemoved: removed.count },
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
      res.status(500).json({ success: false, message: 'Failed to disconnect from integration' });
    }
  }

  // ==================== SYNC + DATA ACCESS ====================

  // Re-read connection state. Direct provider sync (scheduled or on-demand) is
  // intentionally NOT implemented yet — see the roadmap. This updates timestamps
  // and reports imported-record counts so the UI has a truthful "last sync".
  async syncAllIntegrations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { appName } = req.params as { appName?: string };

      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const stateMap = await this.loadState(userId);
      const connected = Object.entries(stateMap)
        .filter(([, v]: [string, any]) => v?.connected)
        .map(([name]) => name)
        .filter((name) => !appName || name === appName);

      const now = new Date().toISOString();
      let successful = 0;
      for (const name of connected) {
        const imported = await prisma.integrationData.aggregate({
          where: { userId, source: { startsWith: `import:${name}:` } },
          _count: { _all: true },
        }).catch(() => ({ _count: { _all: 0 } }));
        stateMap[name] = {
          ...this.readIntegrations(stateMap[name]),
          lastSync: now,
          recordsImported: imported._count._all ? undefined : this.readIntegrations(stateMap[name]).recordsImported,
        };
        await prisma.integrationConnection
          .update({ where: { userId_name: { userId, name } }, data: { lastSyncAt: new Date(), lastSyncStatus: 'ok' } })
          .catch(() => null);
        successful++;
      }
      // Strip undefined so we never write `recordsImported: undefined`.
      for (const name of connected) {
        if (stateMap[name].recordsImported === undefined) delete stateMap[name].recordsImported;
      }
      await this.saveState(userId, stateMap);

      res.json({
        success: true,
        message: `Refreshed ${successful} integration${successful === 1 ? '' : 's'}`,
        data: { total: connected.length, successful, failed: 0, syncedAt: now },
      });
    } catch (error) {
      console.error('Sync failed:', error);
      res.status(500).json({ success: false, message: 'Failed to sync integrations' });
    }
  }

  async fetchIntegrationData(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { appName, dataType } = req.params as { appName: string; dataType?: string };

      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await this.freeFetchData(appName, dataType || 'all', userId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Data fetch failed:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch integration data' });
    }
  }

  async getIntegrationDataForAI(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // One source of truth: live API, last persisted sync, or CSV import.
      // This keeps AI aware of external data even when a provider has no
      // connection row anymore (e.g. disconnected but retained data).
      const snapshots = await fetchAllProviderSnapshots(userId);
      const integrations = snapshots
        .filter((snap) => snap.totalRecords > 0)
        .map((snap) => ({
          source: snap.provider,
          account: snap.accountName,
          lastSync: snap.lastSync,
          origin: snap.source,
          count: snap.totalRecords,
          datasets: Object.fromEntries(
            Object.entries(snap.data).map(([key, items]) => [key, items.length]),
          ),
          data: snap.data,
          errors: snap.errors,
        }));

      if (!integrations.length) {
        return res.json({
          success: true,
          data: { integrations: [], count: 0, message: 'No connected integrations found' },
        });
      }

      res.json({ success: true, data: { integrations, count: integrations.length } });
    } catch (error) {
      console.error('Failed to get integration data for AI:', error);
      res.status(500).json({ success: false, message: 'Failed to get integration data' });
    }
  }

  // Read data for a provider: imported rows when present, otherwise the user's
  // own task rows as a stand-in. Direct provider API reads arrive with the
  // scheduled-sync work.
  async freeFetchData(appName: string, dataType: string, userId: string): Promise<any> {
    const stored = await prisma.integrationData.findMany({
      where: {
        userId,
        OR: [
          { source: { startsWith: `import:${appName}:` } },
          { source: { startsWith: `sync:${appName}:` } },
        ],
      },
      orderBy: { receivedAt: 'desc' },
      take: 20,
    });

    if (stored.length) {
      const wants = !dataType || dataType === 'all';
      const rows = stored.flatMap((r: any) => {
        const bucket = String(r.source || '').split(':')[2] || 'records';
        if (!wants && bucket !== dataType) return [];
        return Array.isArray(r.data?.rows) ? r.data.rows : Array.isArray(r.data?.items) ? r.data.items : [];
      });
      return {
        success: true,
        data: rows,
        count: rows.length,
        metadata: {
          appName,
          dataType,
          source: stored.some((r: any) => String(r.source || '').startsWith('sync:')) ? 'synced' : 'imported',
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    const credentials = await this.getProviderCredentials(userId, appName);
    if (credentials) {
      const result = await fetchProviderData(appName, userId, credentials, { dataType: dataType || 'all' });
      return result;
    }
    // No credentials configured for this provider: surface a truthful fallback.
    return {
      success: true,
      data: [],
      count: 0,
      metadata: { appName, dataType, source: 'none', note: 'No connection credentials are configured for this provider' },
    };
  }

  // ==================== HELPERS ====================

  /** Return decrypted credentials + connection metadata for a provider, or null. */
  async getProviderCredentials(userId: string, providerId: string): Promise<Record<string, string> | null> {
    const conn = await loadFreshConnection(userId, providerId);
    if (!conn) return null;
    const out: Record<string, string> = {};
    if (conn.accessToken) out.accessToken = decryptSecret(conn.accessToken) || '';
    if (conn.refreshToken) out.refreshToken = decryptSecret(conn.refreshToken) || '';
    if (conn.encryptedCredentials) {
      Object.assign(out, readCredentialBlob(conn.encryptedCredentials));
    }
    // Base URLs / emails live in the connection metadata (non-secret, stored at
    // connect time) so providers like Salesforce can reach their instance.
    if (conn.metadata && typeof conn.metadata === 'object') {
      const meta = conn.metadata as Record<string, unknown>;
      if (typeof meta.instanceUrl === 'string') out.instanceUrl = meta.instanceUrl;
      if (typeof meta.baseUrl === 'string') out.baseUrl = meta.baseUrl;
      if (typeof meta.tenantId === 'string') out.tenantId = meta.tenantId;
      if (typeof meta.cloudId === 'string') out.cloudId = meta.cloudId;
      if (typeof meta.email === 'string') out.email = meta.email;
      if (typeof meta.apiToken === 'string') out.apiToken = meta.apiToken;
      if (typeof meta.accessToken === 'string') out.accessToken = meta.accessToken;
      if (typeof meta.secretKey === 'string') out.secretKey = meta.secretKey;
      if (typeof meta.clientId === 'string') out.clientId = meta.clientId;
      if (typeof meta.secret === 'string') out.secret = meta.secret;
      if (typeof meta.botToken === 'string') out.botToken = meta.botToken;
      if (typeof meta.apiDomain === 'string') out.apiDomain = meta.apiDomain;
      if (typeof meta.realm_id === 'string') out.realm_id = meta.realm_id;
      if (typeof meta.stripeUserId === 'string') out.accountId = meta.stripeUserId;
      // Trello's app key is public, so it rides along in the metadata.
      if (typeof meta.apiKey === 'string') out.apiKey = meta.apiKey;
    }
    return Object.keys(out).length > 0 ? out : null;
  }
}
