// server/services/integrationFetcher.service.ts
//
// Harness + shared utilities for the CEO Helper integration data-access layer.
// Provider-specific fetch functions live in sibling files (e.g.
// integrationFetcherGoogleSheets.ts) and are dispatched here by provider id.
//
// Guarantees: pagination honored where supported (nextCursor returned);
// transient failures retried with bounded exponential backoff; payloads
// SANITIZED before leaving the server; errors returned as
// { success: false, error: <redacted> }.

import {
  fetchAirtable,
} from './integrationFetcherAirtable.js';
import {
  fetchAsana,
} from './integrationFetcherAsana.js';
import {
  fetchDropbox,
} from './integrationFetcherDropbox.js';
import {
  fetchGitHub,
} from './integrationFetcherGitHub.js';
import {
  fetchGoogleCalendar,
} from './integrationFetcherGoogleCalendar.js';
import {
  fetchGoogleDrive,
} from './integrationFetcherGoogleDrive.js';
import {
  fetchGoogleSheets,
} from './integrationFetcherGoogleSheets.js';
import {
  fetchHubSpot,
} from './integrationFetcherHubSpot.js';
import {
  fetchJira,
} from './integrationFetcherJira.js';
import {
  fetchMonday,
} from './integrationFetcherMonday.js';
import {
  fetchNotion,
} from './integrationFetcherNotion.js';
import {
  fetchQuickBooks,
} from './integrationFetcherQuickBooks.js';
import {
  fetchSalesforce,
} from './integrationFetcherSalesforce.js';
import {
  fetchSlack,
} from './integrationFetcherSlack.js';
import {
  fetchStripe,
} from './integrationFetcherStripe.js';
import {
  fetchTrello,
} from './integrationFetcherTrello.js';
import {
  fetchZoho,
} from './integrationFetcherZoho.js';
import {
  fetchWithRetry,
  redactError,
  sleep,
} from './integrationFetcherUtils.js';

export type FetcherResult =
  & { success: true; data: any; count?: number; metadata?: Record<string, any>; nextCursor?: string | null }
  | { success: false; data: any; count?: number; metadata?: Record<string, any>; error: string };

export interface FetchOptions {
  dataType?: string;
  cursor?: string | null;
  limit?: number;
  spreadsheetId?: string | null;
  range?: string | null;
  metadata?: Record<string, any>;
}

export async function fetchProviderData(
  providerId: string,
  userId: string,
  credentials: Record<string, string>,
  options: FetchOptions = {},
): Promise<FetcherResult> {
  if (!providerId) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'Missing provider id' };
  }
  if (!credentials || typeof credentials !== 'object') {
    return {
      success: false,
      data: [],
      count: 0,
      metadata: { provider: providerId, dataType: options.dataType },
      error: 'No credentials are configured for this provider. Connect the account first.',
    };
  }
  const creators: Record<string, (creds: Record<string, string>, opts: FetchOptions) => Promise<FetcherResult>> = {
    'google-sheets': fetchGoogleSheets,
    'google-drive': fetchGoogleDrive,
    github: fetchGitHub,
    'google-calendar': fetchGoogleCalendar,
    notion: fetchNotion,
    hubspot: fetchHubSpot,
    salesforce: fetchSalesforce,
    zoho: fetchZoho,
    airtable: fetchAirtable,
    jira: fetchJira,
    asana: fetchAsana,
    monday: fetchMonday,
    slack: fetchSlack,
    quickbooks: fetchQuickBooks,
    stripe: fetchStripe,
    trello: fetchTrello,
    dropbox: fetchDropbox,
  };
  const fn = creators[providerId];
  if (!fn) {
    return {
      success: false,
      data: [],
      count: 0,
      metadata: { provider: providerId, dataType: options.dataType },
      error: `No data fetcher is registered for provider "${providerId}".`,
    };
  }
  try {
    return await fn(credentials, options);
  } catch (error) {
    return { success: false, data: [], count: 0, metadata: { provider: providerId, dataType: options.dataType }, error: redactError(error) };
  }
}
