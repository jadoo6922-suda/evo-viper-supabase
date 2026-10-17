import crypto from 'crypto';
import { promisify } from 'util';

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const utcDateKey = (date = new Date()) => date.toISOString().slice(0, 10);
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

const scrypt = promisify(crypto.scrypt);
export async function scryptAsync(password: string, salt: string, length = 64): Promise<Buffer> {
  return (await scrypt(password, salt, length)) as Buffer;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
