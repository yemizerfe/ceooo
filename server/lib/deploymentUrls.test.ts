import { afterEach, describe, expect, it } from 'bun:test';
import { publicApiBaseUrl, publicFrontendBaseUrl } from './deploymentUrls.js';

const originalEnv = new Map<string, string | undefined>();
const relevantKeys = [
  'API_PUBLIC_URL',
  'BACKEND_URL',
  'RENDER_EXTERNAL_URL',
  'FRONTEND_URL',
  'CORS_ORIGINS',
  'NODE_ENV',
  'PORT',
];

function setEnv(values: Record<string, string | undefined>): void {
  for (const key of relevantKeys) {
    if (!originalEnv.has(key)) originalEnv.set(key, process.env[key]);
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  originalEnv.clear();
});

describe('deployment URL resolution', () => {
  it('uses the hosting platform API URL when no explicit backend URL is set', () => {
    setEnv({
      NODE_ENV: 'production',
      API_PUBLIC_URL: undefined,
      BACKEND_URL: undefined,
      RENDER_EXTERNAL_URL: 'https://api.example.test/',
    });

    expect(publicApiBaseUrl()).toBe('https://api.example.test');
  });

  it('requires a public API URL in production instead of falling back to localhost', () => {
    setEnv({
      NODE_ENV: 'production',
      API_PUBLIC_URL: undefined,
      BACKEND_URL: undefined,
      RENDER_EXTERNAL_URL: undefined,
    });

    expect(() => publicApiBaseUrl()).toThrow(
      'Set BACKEND_URL, API_PUBLIC_URL, or RENDER_EXTERNAL_URL',
    );
  });

  it('uses the first allowed frontend origin when FRONTEND_URL is not supplied', () => {
    setEnv({
      NODE_ENV: 'production',
      FRONTEND_URL: undefined,
      CORS_ORIGINS: ' https://app.example.test/ , https://preview.example.test ',
    });

    expect(publicFrontendBaseUrl()).toBe('https://app.example.test');
  });
});
