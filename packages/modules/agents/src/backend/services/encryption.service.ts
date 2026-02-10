import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, encryptionKey: string): { encrypted: string; iv: string } {
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted: encrypted + authTag,
    iv: iv.toString('hex'),
  };
}

export function decrypt(encrypted: string, iv: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex');
  const ivBuf = Buffer.from(iv, 'hex');

  const authTag = Buffer.from(encrypted.slice(-AUTH_TAG_LENGTH * 2), 'hex');
  const ciphertext = encrypted.slice(0, -AUTH_TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
