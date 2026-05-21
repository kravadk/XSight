export interface CupWriteAuthInput {
  nodeEnv: string;
  writeApiEnabled: boolean;
  configuredKey: string;
  providedKey?: string;
}

export function isCupWriteAuthorized(input: CupWriteAuthInput): { ok: boolean; reason?: string } {
  if (!input.writeApiEnabled) {
    return { ok: false, reason: 'Cup write API is disabled' };
  }

  const configuredKey = input.configuredKey.trim();
  const providedKey = input.providedKey?.trim() ?? '';

  if (!configuredKey) {
    return input.nodeEnv === 'production'
      ? { ok: false, reason: 'CUP_WRITE_API_KEY is required in production' }
      : { ok: true };
  }

  if (providedKey !== configuredKey) {
    return { ok: false, reason: 'Invalid Cup write API key' };
  }

  return { ok: true };
}
