import { eq, and } from 'drizzle-orm';
import { aiProviderKeys } from '@nexus/database';
import type { Database } from '@nexus/database';
import { encrypt, decrypt } from './encryption.service.js';

export async function listProviderKeys(db: Database, orgId: string) {
  const keys = await db.select().from(aiProviderKeys)
    .where(eq(aiProviderKeys.orgId, orgId));

  return keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    label: k.label,
    isActive: k.isActive,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    maskedKey: '••••••••' + k.encryptedKey.slice(-4),
  }));
}

export async function addProviderKey(
  db: Database,
  orgId: string,
  data: { provider: string; apiKey: string; label: string },
  encryptionKey: string,
) {
  const { encrypted, iv } = encrypt(data.apiKey, encryptionKey);

  const [key] = await db.insert(aiProviderKeys).values({
    orgId,
    provider: data.provider,
    encryptedKey: encrypted,
    iv,
    label: data.label,
  }).returning();

  return {
    id: key.id,
    provider: key.provider,
    label: key.label,
    isActive: key.isActive,
    createdAt: key.createdAt,
  };
}

export async function removeProviderKey(db: Database, orgId: string, keyId: string) {
  await db.delete(aiProviderKeys)
    .where(and(eq(aiProviderKeys.id, keyId), eq(aiProviderKeys.orgId, orgId)));
}

export async function getDecryptedKey(
  db: Database,
  orgId: string,
  provider: string,
  encryptionKey: string,
): Promise<string | null> {
  const [key] = await db.select().from(aiProviderKeys)
    .where(and(
      eq(aiProviderKeys.orgId, orgId),
      eq(aiProviderKeys.provider, provider),
      eq(aiProviderKeys.isActive, true),
    ))
    .limit(1);

  if (!key) return null;
  return decrypt(key.encryptedKey, key.iv, encryptionKey);
}

export async function testProviderKey(provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });
        if (res.status === 401) return { success: false, error: 'Invalid API key' };
        return { success: true };
      }
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.status === 401) return { success: false, error: 'Invalid API key' };
        return { success: true };
      }
      case 'google': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: true };
      }
      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
