// server/services/ai/config.ts
// ================================
// Centralized AI configuration.
// All environment variables and runtime constants related to the AI system are
// defined here so that the rest of the codebase doesn't need to parse env vars
// or redefine constants.
// ================================

// ---- API Keys ----
// Support multiple environment variable names for flexibility:
// - GOOGLE_API_KEY: Next.js/other frameworks convention
// - GEMINI_API_KEY:  Google AI Studio convention
// - AI_API_KEY:      General AI provider convention
export const GEMINI_API_KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.AI_API_KEY;

// ---- Runtime Configuration ----
export const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '60000', 10);
export const AI_CACHE_TTL = parseInt(process.env.AI_CACHE_TTL || '300', 10);
export const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3', 10);
export const AI_ENABLE_ANALYTICS = process.env.AI_ENABLE_ANALYTICS === 'true';

// ---- Validation ----
if (!GEMINI_API_KEY) {
  console.warn('⚠️  Gemini API key not set. AI features will be limited.');
}
