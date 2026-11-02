export interface Provider {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  integrationType: string;
  authMethods: string[];
  oauth?: {
    authorizeUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientIdEnv: string;
    /** Extra env names checked when `clientIdEnv` is empty (e.g. Stripe's `ca_…`). */
    clientIdEnvAlternatives?: string[];
    clientSecretEnv: string;
    redirectUriEnv: string;
    extraAuthParams?: Record<string, string>;
    extraTokenParams?: Record<string, string>;
    usePkce?: boolean;
    useBasicAuth?: boolean;
    useJsonTokenRequest?: boolean;
    skipRedirectUri?: boolean;
  };
  /**
   * OAuth 1.0a (three-legged). Trello is the only provider here that never
   * shipped OAuth 2.0, so this covers the consumer key → request token →
   * “authorise this app” screen → access token handshake.
   */
  oauth1?: {
    requestTokenUrl: string;
    authorizeUrl: string;
    accessTokenUrl: string;
    consumerKeyEnv: string;
    consumerSecretEnv: string;
    redirectUriEnv: string;
    scope?: string;
    appName: string;
    expiration?: string;
  };
  apiKey?: {
    fields: Array<{
      key: string;
      label: string;
      secret: boolean;
      required: boolean;
      placeholder?: string;
      help?: string;
    }>;
    serverCredentialEnv: Record<string, string>;
    /**
     * Extra env names checked per field when the primary one is empty. Trello
     * uses this so the pair already sitting in `TRELLO_CLIENT_ID` /
     * `TRELLO_CLIENT_SECRET` is used without asking for another variable.
     */
    serverCredentialEnvFallbacks?: Record<string, string[]>;
    test?: (creds: Record<string, string>) => { url: string; headers: Record<string, string> };
  };
  csvImport?: {
    fields: Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
      defaultValue?: string;
    }>;
    recordType?: string;
  };
  note?: string;
}

export const PROVIDERS: Provider[] = [
  // ==================== CRM ====================
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: '🟠',
    category: 'CRM',
    description: 'Contacts, deals, companies, and pipeline management',
    integrationType: 'CRM',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      scopes: ['crm.objects.contacts.read', 'crm.objects.deals.read', 'crm.objects.companies.read'],
      clientIdEnv: 'HUBSPOT_CLIENT_ID',
      clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
      redirectUriEnv: 'HUBSPOT_REDIRECT_URI',
      useBasicAuth: false,
    },
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    icon: '☁️',
    category: 'CRM',
    description: 'Contacts, opportunities, accounts, and leads',
    integrationType: 'CRM',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: ['api', 'refresh_token', 'offline_access'],
      clientIdEnv: 'SALESFORCE_CLIENT_ID',
      clientSecretEnv: 'SALESFORCE_CLIENT_SECRET',
      redirectUriEnv: 'SALESFORCE_REDIRECT_URI',
      // Salesforce Connected Apps now require PKCE on the authorization
      // request — without a `code_challenge` it fails with
      // "missing required code challenge" before the user sees a login page.
      usePkce: true,
    },
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    icon: '🔵',
    category: 'CRM',
    description: 'Contacts, deals, and accounts from Zoho CRM (the signed-in Zoho account needs the CRM module)',
    integrationType: 'CRM',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://accounts.zoho.com/oauth/v2/auth',
      tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
      scopes: ['ZohoCRM.modules.contacts.READ', 'ZohoCRM.modules.deals.READ', 'ZohoCRM.modules.accounts.READ'],
      clientIdEnv: 'ZOHO_CLIENT_ID',
      clientSecretEnv: 'ZOHO_CLIENT_SECRET',
      redirectUriEnv: 'ZOHO_REDIRECT_URI',
      extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    },
  },

  // ==================== PROJECT MANAGEMENT ====================
  {
    id: 'jira',
    name: 'Jira',
    icon: '🔷',
    category: 'Project Management',
    description: 'Projects, issues, sprints, and team workload',
    integrationType: 'PROJECT_MANAGEMENT',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      scopes: ['read:jira-work', 'read:jira-user', 'offline_access'],
      clientIdEnv: 'JIRA_CLIENT_ID',
      clientSecretEnv: 'JIRA_CLIENT_SECRET',
      redirectUriEnv: 'JIRA_REDIRECT_URI',
      extraAuthParams: { audience: 'api.atlassian.com', prompt: 'consent' },
    },
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: '🎯',
    category: 'Project Management',
    description: 'Projects, tasks, and team workspaces',
    integrationType: 'PROJECT_MANAGEMENT',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://app.asana.com/-/oauth_authorize',
      tokenUrl: 'https://app.asana.com/-/oauth_token',
      scopes: ['workspaces:read', 'projects:read', 'tasks:read'],
      clientIdEnv: 'ASANA_CLIENT_ID',
      clientSecretEnv: 'ASANA_CLIENT_SECRET',
      redirectUriEnv: 'ASANA_REDIRECT_URI',
    },
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: '🗂️',
    category: 'Project Management',
    description: 'Boards, lists, and cards for lightweight planning',
    integrationType: 'PROJECT_MANAGEMENT',
    // Trello never shipped OAuth 2.0. Its three-legged OAuth 1.0a handshake
    // still sends the user to trello.com to approve the app, and the access
    // token is long-lived (expiration=never), so reads keep working.
    authMethods: ['oauth1', 'apiKey', 'csv'],
    oauth1: {
      requestTokenUrl: 'https://trello.com/1/OAuthGetRequestToken',
      authorizeUrl: 'https://trello.com/1/OAuthAuthorizeToken',
      accessTokenUrl: 'https://trello.com/1/OAuthGetAccessToken',
      consumerKeyEnv: 'TRELLO_CLIENT_ID',
      consumerSecretEnv: 'TRELLO_CLIENT_SECRET',
      redirectUriEnv: 'TRELLO_REDIRECT_URI',
      scope: 'read',
      appName: 'CEO Helper',
      expiration: 'never',
    },
    // Trello's OAuth handshake needs a key that belongs to a live Power-Up.
    // Keys copied from trello.com/app-key still read boards through the plain
    // REST API, so the same credentials can be entered directly when the
    // consent screen answers “App not found”.
    apiKey: {
      fields: [
        {
          key: 'apiKey',
          label: 'API key',
          secret: false,
          required: true,
          placeholder: '32-character key',
          help: 'trello.com/app-key → Key',
        },
        {
          key: 'token',
          label: 'Token',
          secret: true,
          required: true,
          placeholder: 'Token shown under the key',
          help: 'Same page → Token (click “Token” to generate one)',
        },
      ],
      serverCredentialEnv: { apiKey: 'TRELLO_API_KEY', token: 'TRELLO_TOKEN' },
      serverCredentialEnvFallbacks: {
        apiKey: ['TRELLO_CLIENT_ID'],
        token: ['TRELLO_CLIENT_SECRET'],
      },
      test: (creds) => ({
        url: `https://api.trello.com/1/members/me?key=${encodeURIComponent(creds.apiKey ?? '')}&token=${encodeURIComponent(creds.token ?? '')}`,
        headers: { Accept: 'application/json' },
      }),
    },
  },
  {
    id: 'monday',
    name: 'Monday.com',
    icon: '📅',
    category: 'Project Management',
    description: 'Boards, items, and team workflows',
    integrationType: 'PROJECT_MANAGEMENT',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://auth.monday.com/oauth2/authorize',
      tokenUrl: 'https://auth.monday.com/oauth2/token',
      scopes: ['boards:read', 'workspaces:read', 'users:read'],
      clientIdEnv: 'MONDAY_CLIENT_ID',
      clientSecretEnv: 'MONDAY_CLIENT_SECRET',
      redirectUriEnv: 'MONDAY_REDIRECT_URI',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    category: 'Project Management',
    description: 'Repositories, issues, and pull requests',
    integrationType: 'OTHER',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'read:user'],
      clientIdEnv: 'GITHUB_CLIENT_ID',
      clientSecretEnv: 'GITHUB_CLIENT_SECRET',
      redirectUriEnv: 'GITHUB_REDIRECT_URI',
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📓',
    category: 'Project Management',
    description: 'Pages, databases, and workspace content',
    integrationType: 'OTHER',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      scopes: [],
      clientIdEnv: 'NOTION_CLIENT_ID',
      clientSecretEnv: 'NOTION_CLIENT_SECRET',
      redirectUriEnv: 'NOTION_REDIRECT_URI',
      // Notion requires HTTP Basic client auth, a JSON token body, and the
      // `owner=user` authorize parameter; scopes come from the integration.
      useBasicAuth: true,
      useJsonTokenRequest: true,
      extraAuthParams: { owner: 'user' },
    },
  },

  // ==================== COMMUNICATION ====================
  {
    id: 'slack',
    name: 'Slack',
    icon: '💬',
    category: 'Communication',
    description: 'Channels, messages, and team activity',
    integrationType: 'COMMUNICATION',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['channels:read', 'channels:history', 'users:read'],
      clientIdEnv: 'SLACK_CLIENT_ID',
      clientSecretEnv: 'SLACK_CLIENT_SECRET',
      redirectUriEnv: 'SLACK_REDIRECT_URI',
      useBasicAuth: true,
    },
  },

  // ==================== FINANCE ====================
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    icon: '📊',
    category: 'Finance',
    description: 'Invoices, expenses, and financial reports',
    integrationType: 'FINANCE',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      scopes: ['com.intuit.quickbooks.accounting'],
      clientIdEnv: 'QUICKBOOKS_CLIENT_ID',
      clientSecretEnv: 'QUICKBOOKS_CLIENT_SECRET',
      redirectUriEnv: 'QUICKBOOKS_REDIRECT_URI',
      useBasicAuth: true,
      extraAuthParams: { response_type: 'code' },
    },
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    category: 'Finance',
    description: 'Payment history, customers, and revenue trends',
    integrationType: 'FINANCE',
    // Stripe Connect: the account owner approves the read-only connection on
    // Stripe's own consent screen and Stripe returns an access token scoped to
    // their account. STRIPE_CLIENT_ID is the `ca_...` Connect client id and
    // STRIPE_SECRET_KEY is the platform secret key used for the exchange.
    authMethods: ['oauth2', 'apiKey', 'csv'],
    oauth: {
      authorizeUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
      scopes: ['read_only'],
      clientIdEnv: 'STRIPE_CLIENT_ID',
      clientIdEnvAlternatives: ['STRIPE_CONNECT_CLIENT_ID'],
      clientSecretEnv: 'STRIPE_SECRET_KEY',
      redirectUriEnv: 'STRIPE_REDIRECT_URI',
      extraAuthParams: { response_type: 'code', stripe_landing: 'login' },
    },
    // Without a Connect client id there is no consent screen to redirect to, so
    // the platform's own secret key is used for a read-only connection instead.
    // Adding STRIPE_CLIENT_ID later upgrades the card to the redirect flow.
    apiKey: {
      fields: [],
      serverCredentialEnv: { accessToken: 'STRIPE_SECRET_KEY' },
      test: (creds) => ({
        url: 'https://api.stripe.com/v1/balance',
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      }),
    },
  },

  // ==================== DATA / PRODUCTIVITY ====================
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    icon: '📗',
    category: 'Data',
    description: 'Spreadsheet data as a source for company records',
    integrationType: 'OTHER',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['openid', 'email', 'https://www.googleapis.com/auth/spreadsheets.readonly'],
      clientIdEnv: 'GOOGLE_SHEETS_CLIENT_ID',
      clientSecretEnv: 'GOOGLE_SHEETS_CLIENT_SECRET',
      redirectUriEnv: 'GOOGLE_CALLBACK_URL',
      extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    },
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: '🪐',
    category: 'Data',
    description: 'File storage, document import, and file-level data access',
    integrationType: 'OTHER',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'openid',
        'email',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
      clientIdEnv: 'GOOGLE_DRIVE_CLIENT_ID',
      clientSecretEnv: 'GOOGLE_DRIVE_CLIENT_SECRET',
      redirectUriEnv: 'GOOGLE_CALLBACK_URL',
      extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    },
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    icon: '📅',
    category: 'Productivity',
    description: 'Events, meetings, and schedule data',
    integrationType: 'OTHER',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
      clientIdEnv: 'GOOGLE_CALENDAR_CLIENT_ID',
      clientSecretEnv: 'GOOGLE_CALENDAR_CLIENT_SECRET',
      redirectUriEnv: 'GOOGLE_CALLBACK_URL',
      extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    },
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: '🗃️',
    category: 'Data',
    description: 'Bases, tables, and records from Airtable',
    integrationType: 'OTHER',
    authMethods: ['apiKey', 'csv'],
    apiKey: {
      fields: [
        {
          key: 'accessToken',
          label: 'Personal Access Token',
          secret: true,
          required: true,
          placeholder: 'pat...',
          help: 'Create a personal access token at airtable.com/create/tokens',
        },
      ],
      serverCredentialEnv: { accessToken: 'AIRTABLE_ACCESS_TOKEN' },
      test: (creds) => ({
        url: 'https://api.airtable.com/v0/meta/bases',
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      }),
    },
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📁',
    category: 'Data',
    description: 'File storage, file metadata, and document import',
    integrationType: 'OTHER',
    authMethods: ['oauth2', 'csv'],
    oauth: {
      authorizeUrl: 'https://www.dropbox.com/oauth2/authorize',
      tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
      scopes: ['files.metadata.read', 'files.content.read'],
      clientIdEnv: 'DROPBOX_CLIENT_ID',
      clientSecretEnv: 'DROPBOX_CLIENT_SECRET',
      redirectUriEnv: 'DROPBOX_REDIRECT_URI',
      useBasicAuth: true,
      // Without this Dropbox returns a 4-hour token and no refresh token.
      extraAuthParams: { token_access_type: 'offline' },
    },
  },
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

/** UPPER_SNAKE form of a provider id, used for env overrides. */
export function envKeyFor(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

/**
 * Authorization / token endpoints, allowing a per-provider override so sandbox
 * or self-hosted instances can be targeted (e.g. Salesforce sandbox):
 *   SALESFORCE_AUTHORIZE_URL, SALESFORCE_TOKEN_URL
 */
export function resolveOAuthUrls(provider: Provider): { authorizeUrl: string; tokenUrl: string } | null {
  if (!provider.oauth) return null;
  const key = envKeyFor(provider.id);
  return {
    authorizeUrl: process.env[`${key}_AUTHORIZE_URL`] || provider.oauth.authorizeUrl,
    tokenUrl: process.env[`${key}_TOKEN_URL`] || provider.oauth.tokenUrl,
  };
}

/**
 * OAuth client id, honoring per-provider fallbacks. Stripe is the reason this
 * exists: its Connect client id (`ca_…`) has lived under a couple of names.
 */
export function providerClientId(provider: Provider): string | undefined {
  const oauth = provider.oauth;
  if (!oauth) return undefined;
  const names = [oauth.clientIdEnv, ...(oauth.clientIdEnvAlternatives || [])];
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** OAuth client secret, or undefined when unset. */
export function providerClientSecret(provider: Provider): string | undefined {
  const name = provider.oauth?.clientSecretEnv;
  if (!name) return undefined;
  return process.env[name]?.trim() || undefined;
}

export function getProvider(id: string): Provider | undefined {
  return BY_ID.get(id) || BY_ID.get(id.replace(/-/g, '_'));
}

/** True when every env var this provider's OAuth flow needs is present. */
export function oauthConfigured(provider: Provider): boolean {
  if (provider.oauth) {
    return Boolean(providerClientId(provider) && providerClientSecret(provider));
  }
  if (provider.oauth1) {
    return Boolean(
      process.env[provider.oauth1.consumerKeyEnv] && process.env[provider.oauth1.consumerSecretEnv],
    );
  }
  return false;
}

/** Consumer key/secret for an OAuth 1.0a provider, or null when unset. */
export function oauth1Credentials(
  provider: Provider,
): { consumerKey: string; consumerSecret: string } | null {
  const config = provider.oauth1;
  if (!config) return null;
  const consumerKey = process.env[config.consumerKeyEnv];
  const consumerSecret = process.env[config.consumerSecretEnv];
  if (!consumerKey || !consumerSecret) return null;
  return { consumerKey, consumerSecret };
}

export function apiKeyConfigured(provider: Provider): boolean {
  return Boolean(getConfiguredApiCredentials(provider));
}

export function getConfiguredApiCredentials(provider: Provider): Record<string, string> | null {
  const config = provider.apiKey;
  if (!config?.serverCredentialEnv) return null;

  const credentials = Object.fromEntries(
    Object.entries(config.serverCredentialEnv)
      .map(([field, envName]) => {
        const names = [envName, ...(config.serverCredentialEnvFallbacks?.[field] || [])];
        for (const name of names) {
          const value = process.env[name]?.trim();
          if (value) return [field, value];
        }
        return [field, ''];
      })
      .filter(([, value]) => Boolean(value)),
  );
  const missingRequiredFields = config.fields.some((field) => field.required && !credentials[field.key]);
  return missingRequiredFields ? null : credentials;
}

function missingServerCredentialEnv(provider: Provider): string[] {
  const config = provider.apiKey;
  if (!config) return [];
  return Object.entries(config.serverCredentialEnv)
    .filter(([field, envName]) => {
      const names = [envName, ...(config.serverCredentialEnvFallbacks?.[field] || [])];
      return !names.some((name) => process.env[name]?.trim());
    })
    .map(([, envName]) => envName);
}

function missingOAuthEnv(provider: Provider): string[] {
  if (provider.oauth) {
    const missing: string[] = [];
    if (!providerClientId(provider)) missing.push(provider.oauth.clientIdEnv);
    if (!providerClientSecret(provider)) missing.push(provider.oauth.clientSecretEnv);
    return missing;
  }
  if (provider.oauth1) {
    return [provider.oauth1.consumerKeyEnv, provider.oauth1.consumerSecretEnv].filter(
      (envName) => !process.env[envName]?.trim(),
    );
  }
  return [];
}

/** Public, non-secret view of a provider for the client. */
export function serializeProvider(provider: Provider) {
  return {
    id: provider.id,
    name: provider.name,
    icon: provider.icon,
    category: provider.category,
    description: provider.description,
    authMethods: provider.authMethods,
    credentialFields: provider.apiKey?.fields ?? [],
    oauthConfigured: oauthConfigured(provider),
    supportsRedirectAuth: Boolean(provider.oauth || provider.oauth1),
    oauthFlavor: provider.oauth ? 'oauth2' : provider.oauth1 ? 'oauth1' : null,
    missingOAuthEnv: missingOAuthEnv(provider),
    oauthScopes: provider.oauth?.scopes ?? [],
    clientIdEnv: provider.oauth?.clientIdEnv,
    apiKeyConfigured: apiKeyConfigured(provider),
    missingServerCredentialEnv: missingServerCredentialEnv(provider),
    note: provider.note,
  };
}

export const INTEGRATION_CATEGORY_ICONS: Record<string, string> = {
  CRM: '👤',
  Finance: '💰',
  ERP: '🏛️',
  'Project Management': '📊',
  Communication: '💬',
  Productivity: '⚡',
  'Business Suite': '🏢',
  Data: '📗',
};

/** OAuth 1.0a endpoints, with the same per-provider env override support. */
export function resolveOAuth1Urls(
  provider: Provider,
): { requestTokenUrl: string; authorizeUrl: string; accessTokenUrl: string } | null {
  const config = provider.oauth1;
  if (!config) return null;
  const key = envKeyFor(provider.id);
  return {
    requestTokenUrl: process.env[`${key}_REQUEST_TOKEN_URL`] || config.requestTokenUrl,
    authorizeUrl: process.env[`${key}_AUTHORIZE_URL`] || config.authorizeUrl,
    accessTokenUrl: process.env[`${key}_ACCESS_TOKEN_URL`] || config.accessTokenUrl,
  };
}

/** True when a provider connects by redirecting the browser to the vendor. */
export function usesRedirectAuth(provider: Provider): boolean {
  return Boolean(provider.oauth || provider.oauth1);
}
