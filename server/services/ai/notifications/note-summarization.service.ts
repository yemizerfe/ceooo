// server/services/ai/notifications/note-summarization.service.ts
// ================================
// Note and meeting content summarization for AI.
// ================================

import { PromptTemplates } from '../../prompts.js';
import { callGemini } from '../call-gemini.service.js';

// ---- Summarize Note ----
export async function summarizeNote(
  userId: string,
  title: string,
  content: string
): Promise<any> {
  const prompt = `Summarize this note into:
  1. Original title/context
  2. Key points
  3. Action items
  4. Suggested tags
  
  Title: ${title}
  Content: ${content}`;

  try {
    const aiResponse = await callGemini(
      prompt,
      'You are an AI assistant that helps summarize notes and extract key insights.',
      userId,
      'summarize_note'
    );

    // Try to parse structured data from the response
    let parsed = {
      title: title || 'Untitled Note',
      summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      keyPoints: ['Review content for key insights'],
      suggestedTags: ['note'],
      actionItems: [],
      fullContent: content,
      summarizedAt: new Date().toISOString(),
    };

    try {
      const parsedJson = JSON.parse(aiResponse);
      parsed = { ...parsed, ...parsedJson };
    } catch {
      // If not JSON, use the fallback
    }

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error('Note summarization AI call failed:', error);
    return {
      success: true,
      data: {
        originalTitle: title || 'Untitled Note',
        summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        keyPoints: ['Review content for key insights'],
        suggestedTags: ['note'],
        actionItems: [],
        fullContent: content,
        summarizedAt: new Date().toISOString(),
        fallback: true,
      },
    };
  }
}

// ---- Summarize Meeting ----
export async function summarizeMeeting(
  userId: string,
  title: string,
  content: string,
  attendees: string[] = []
): Promise<any> {
  const prompt = `Summarize this meeting into a structured report:
  1. Key decisions made
  2. Action items with owners and deadlines
  3. Topics for follow-up
  4. Next meeting date (if mentioned)
  
  Meeting: ${title}
  Attendees: ${attendees.join(', ') || 'Not specified'}
  Content: ${content}`;

  try {
    const aiResponse = await callGemini(
      prompt,
      'You are a professional meeting secretary. Create clear, actionable meeting summaries.',
      userId,
      'summarize_meeting'
    );

    // Try to parse structured data from the response
    let parsed = {
      originalTitle: title || 'Untitled Meeting',
      summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      keyPoints: ['Review content for key insights'],
      suggestedTags: ['meeting'],
      actionItems: [],
      attendees: attendees,
      fullContent: content,
      summarizedAt: new Date().toISOString(),
    };

    try {
      const parsedJson = JSON.parse(aiResponse);
      parsed = { ...parsed, ...parsedJson };
    } catch {
      // If not JSON, use the fallback
    }

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error('Meeting summarization AI call failed:', error);
    return {
      success: true,
      data: {
        originalTitle: title || 'Untitled Meeting',
        summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        keyPoints: ['Review content for key insights'],
        suggestedTags: ['meeting'],
        actionItems: [],
        attendees: attendees,
        fullContent: content,
        summarizedAt: new Date().toISOString(),
        fallback: true,
      },
    };
  }
}
