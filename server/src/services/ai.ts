import Anthropic from '@anthropic-ai/sdk';
import { env, isConfigured } from '../config/env.js';
import { XSIGHT_SYSTEM_PROMPT, ANALYTICS_SYSTEM_PROMPT } from '../utils/prompts.js';
import { recordAiUsage } from './economyLoop.js';
import { recordActivity } from './activityTracker.js';
import type { CardPayload, ChatResponse } from '../types/index.js';

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!isConfigured.anthropic()) {
    throw new AiServiceError('AI service not configured: ANTHROPIC_API_KEY required');
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return client;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  userMessage: string;
  /** Pre-built REAL-TIME DATA block (markdown-like plain text) */
  contextBlock: string;
  /** Last N turns of conversation history (newest last) */
  history?: ChatTurn[];
}

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const { userMessage, contextBlock, history = [] } = req;

  // Compose final user turn: data block + actual user question
  const composedUser = `${contextBlock}\n\n[USER MESSAGE]\n${userMessage}`;

  const messages = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user' as const, content: composedUser },
  ];

  let res;
  try {
    res = await getClient().messages.create(
      {
        model: env.anthropicModel,
        max_tokens: 4096,
        system: XSIGHT_SYSTEM_PROMPT,
        messages,
      },
      { signal: AbortSignal.timeout(45_000) },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AiServiceError('AI request timed out after 45s');
    }
    throw new AiServiceError(err instanceof Error ? err.message : 'anthropic call failed');
  }

  // Record real AI usage for the economy snapshot
  if (res.usage) {
    recordAiUsage(res.usage.input_tokens ?? 0, res.usage.output_tokens ?? 0);
  }
  recordActivity('ai.chat', `tokens=${(res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0)}`);

  const textBlock = res.content.find((b) => b.type === 'text');
  const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  if (!raw) {
    throw new AiServiceError('anthropic returned empty response');
  }

  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: { cards?: CardPayload[] };
  try {
    parsed = JSON.parse(cleaned) as { cards?: CardPayload[] };
  } catch {
    throw new AiServiceError(`anthropic returned non-JSON response: ${raw.slice(0, 200)}`);
  }
  if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new AiServiceError('anthropic returned empty or invalid cards array');
  }
  return { cards: parsed.cards };
}

export async function analyticsJson<T = unknown>(
  task: string,
  context: Record<string, unknown> = {},
): Promise<T> {
  let res;
  try {
    res = await getClient().messages.create(
      {
        model: env.anthropicModel,
        max_tokens: 2048,
        system: ANALYTICS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Task: ${task}\n\nContext (JSON):\n${JSON.stringify(context, null, 2)}\n\nReturn JSON only.`,
          },
        ],
      },
      { signal: AbortSignal.timeout(30_000) },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AiServiceError('Analytics AI request timed out after 30s');
    }
    throw new AiServiceError(err instanceof Error ? err.message : 'anthropic call failed');
  }

  if (res.usage) {
    recordAiUsage(res.usage.input_tokens ?? 0, res.usage.output_tokens ?? 0);
  }
  recordActivity('ai.analytics', task.slice(0, 60));

  const textBlock = res.content.find((b) => b.type === 'text');
  const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  if (!raw) throw new AiServiceError('anthropic returned empty response');
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AiServiceError(`anthropic returned non-JSON response: ${raw.slice(0, 200)}`);
  }
}
