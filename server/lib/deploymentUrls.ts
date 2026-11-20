const LOCAL_FRONTEND_URL = 'http://localhost:3000';

function normalizeBaseUrl(value: string, setting: string): string {
  const normalizedValue = value.trim();
  let url: URL;
  try {
    url = new URL(normalizedValue);
  } catch {
    throw new Error(`${setting} must be an absolute URL.`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${setting} must use HTTP or HTTPS.`);
  }

  return normalizedValue.replace(/\/+$/, '');
}

export function publicApiBaseUrl(): string {
  const configuredUrl =
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL;

  if (!configuredUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Set BACKEND_URL, API_PUBLIC_URL, or RENDER_EXTERNAL_URL to the public API origin.',
      );
    }
    return `http://localhost:${process.env.PORT || 5010}`;
  }

  return normalizeBaseUrl(
    configuredUrl,
    'BACKEND_URL, API_PUBLIC_URL, or RENDER_EXTERNAL_URL',
  );
}

export function integrationApiBaseUrl(): string {
  const configuredUrl = process.env.INTEGRATIONS_REDIRECT_BASE;
  return configuredUrl
    ? normalizeBaseUrl(configuredUrl, 'INTEGRATIONS_REDIRECT_BASE')
    : publicApiBaseUrl();
}

export function publicFrontendBaseUrl(): string {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).find(Boolean);

  if (!configuredUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Set FRONTEND_URL or CORS_ORIGINS to the public frontend origin.');
    }
    return LOCAL_FRONTEND_URL;
  }

  return normalizeBaseUrl(configuredUrl, 'FRONTEND_URL');
}
