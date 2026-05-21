/**
 * Posts pundit announcements to X (Twitter). `composeTweet` is a pure text builder;
 * `postToX` performs an OAuth-1.0a-signed POST to the X API v2 and honestly no-ops
 * when the four X_* keys are not configured; `announceExecution` ties them together
 * and records every attempt to the X post log.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { env, isConfigured } from '../config/env.js';
import { recordXPost, type XPost } from './xPostLog.js';
import type { PunditExecution } from './punditExecutor.js';

const TWEETS_URL = 'https://api.twitter.com/2/tweets';

/** Pure: compose the announcement tweet for a verified pundit stake. */
export function composeTweet(execution: PunditExecution): string {
  const conviction = Math.round(execution.conviction * 100);
  const proof = execution.explorerUrl ?? '';
  return (
    `🤖 Hermes staked ${execution.amountDisplay} on ${execution.pick} — ${execution.label} ` +
    `(conviction ${conviction}%).\n\nVerified on X Layer ⬇️\n${proof}`
  );
}

/** RFC-3986 percent-encoding, as OAuth 1.0a requires. */
function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Build the OAuth 1.0a Authorization header for a JSON-body POST (body is not signed). */
function oauthHeader(method: string, url: string): string {
  const params: Record<string, string> = {
    oauth_consumer_key: env.xApiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.xAccessToken,
    oauth_version: '1.0',
  };
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k]!)}`)
    .join('&');
  const baseString = `${method.toUpperCase()}&${rfc3986(url)}&${rfc3986(paramString)}`;
  const signingKey = `${rfc3986(env.xApiSecret)}&${rfc3986(env.xAccessTokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
  const headerParams = { ...params, oauth_signature: signature };
  return (
    'OAuth ' +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${rfc3986(k)}="${rfc3986(headerParams[k as keyof typeof headerParams])}"`)
      .join(', ')
  );
}

/** Post a tweet. No-ops honestly when X is not configured. */
export async function postToX(text: string): Promise<{ ok: boolean; tweetId: string | null; reason: string }> {
  if (!isConfigured.x()) return { ok: false, tweetId: null, reason: 'x_not_configured' };
  try {
    const res = await fetch(TWEETS_URL, {
      method: 'POST',
      headers: {
        Authorization: oauthHeader('POST', TWEETS_URL),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: { id?: string }; detail?: string; title?: string };
    if (!res.ok) {
      return { ok: false, tweetId: null, reason: body.detail ?? body.title ?? `x_api_${res.status}` };
    }
    return { ok: true, tweetId: body.data?.id ?? null, reason: 'posted' };
  } catch (err) {
    return { ok: false, tweetId: null, reason: err instanceof Error ? err.message : 'x_request_failed' };
  }
}

/**
 * Announce a pundit execution on X. Only verified `staked` executions are announced;
 * every attempt (including skips/failures) is recorded to the X post log.
 */
export async function announceExecution(execution: PunditExecution): Promise<XPost> {
  const now = new Date().toISOString();
  if (execution.status !== 'staked' || !execution.verified) {
    return recordXPost({
      matchId: execution.matchId,
      text: '',
      status: 'skipped',
      tweetId: null,
      reason: `not announced — execution status ${execution.status}`,
      createdAt: now,
    });
  }
  const text = composeTweet(execution);
  const result = await postToX(text);
  return recordXPost({
    matchId: execution.matchId,
    text,
    status: result.ok ? 'posted' : 'failed',
    tweetId: result.tweetId,
    reason: result.reason,
    createdAt: now,
  });
}
