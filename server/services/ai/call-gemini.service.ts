// server/services/ai/call-gemini.service.ts
// ================================
// Low-level Gemini API call wrapper with caching and retry logic.
// This module handles:
//   1. Cache checking and storage
//   2. API calls to Google Gemini
//   3. Retry logic with exponential backoff
//   4. Usage logging
// ================================

import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../lib/prisma.js';
import { AI_TIMEOUT, AI_CACHE_TTL, AI_MAX_RETRIES, AI_ENABLE_ANALYTICS } from './config.js';

// ---- Gemini client initialization ----
// We check for the API key here so that missing keys don't fail application startup.
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY,
  httpOptions: { timeout: AI_TIMEOUT },
});

// ---- Cache management ----
// In-memory cache for AI responses. Should be used via getCached()/setCache()
// to ensure consistent behavior across all AI calls.
const cache = new Map<string, { data: string; timestamp: number }>();

/**
 * Get cached response if it exists and is still valid.
 */
export function getCached(key: string): string | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL * 1000) {
    return cached.data;
  }
  return null;
}

/**
 * Store a response in the cache.
 */
export function setCache(key: string, data: string): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear all cache or a specific entry.
 */
export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// ---- Usage logging ----
// Logs AI API usage to database for analytics and billing purposes.
async function logUsage(
  userId: string,
  feature: string,
  success: boolean,
  error?: string,
  cacheHit: boolean = false,
  durationMs: number = 0,
  promptTokens: number = 0,
  responseTokens: number = 0,
  totalTokens: number = 0,
): Promise<void> {
  if (!AI_ENABLE_ANALYTICS) return;

  try {
    await prisma.aIUsage.create({
      data: {
        userId,
        feature,
        promptTokens,
        responseTokens,
        totalTokens,
        durationMs,
        success,
        error,
        cacheHit,
      },
    });
  } catch (e) {
    // Logging must never break the main flow
    console.error('Failed to log AI usage:', e);
  }
}

// ---- Gemini API call with retry ----
/**
 * Call the Gemini API with caching and retry logic.
 *
 * @param prompt - The user prompt to send
 * @param systemInstruction - Optional system instruction to prepend
 * @param userId - User ID for usage tracking
 * @param feature - Feature name for logging and cache key
 * @returns The AI response text
 */
export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  userId: string = 'system',
  feature: string = 'general',
): Promise<string> {
  // Build cache key from feature, user, and prompt
  const cacheKey = `${feature}_${userId}_${prompt.substring(0, 100)}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit for ${feature}`);
    await logUsage(userId, feature, true, undefined, true, 0);
    return cached;
  }

  let lastError: Error | null = null;
  let totalDuration = 0;

  for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      console.log(`🔄 Gemini API call: ${feature} (attempt ${attempt}/${AI_MAX_RETRIES})`);

      // Build content array for the API
      const contents: any[] = [];

      if (systemInstruction) {
        contents.push({ role: 'system', parts: [{ text: systemInstruction }] });
      }

      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await (ai as any).models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents,
      });

      const response = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!response) {
        throw new Error('Empty response from Gemini');
      }

      // Cache the successful response
      setCache(cacheKey, response);

      // Log usage
      const duration = Date.now() - startTime;
      totalDuration += duration;

      await logUsage(
        userId,
        feature,
        true,
        undefined,
        false,
        duration,
        result.usageMetadata?.promptTokenCount || 0,
        result.usageMetadata?.candidatesTokenCount || 0,
        result.usageMetadata?.totalTokenCount || 0,
      );

      return response;

    } catch (error) {
      lastError = error as Error;
      const duration = Date.now() - startTime;
      totalDuration += duration;

      console.error(`❌ Gemini API error (attempt ${attempt}):`, lastError.message);

      // Log failed attempt
      await logUsage(userId, feature, false, lastError.message, false, duration);

      // Don't retry on 4xx errors
      const errorMessage = lastError.message.toLowerCase();
      if (lastError.message.includes('4') && !lastError.message.includes('429')) {
        console.error(`⛔ 4xx error, not retrying: ${lastError.message}`);
        throw lastError;
      }

      // Wait before retry with exponential backoff
      if (attempt < AI_MAX_RETRIES) {
        const backoffDelay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  // All retries exhausted
  console.error(`⛔ All ${AI_MAX_RETRIES} attempts failed for feature: ${feature}`);
  throw lastError || new Error('AI service failed');
}
