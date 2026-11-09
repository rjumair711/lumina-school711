import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

// AES-256-GCM for API keys at rest. The key comes from AI_ENCRYPTION_KEY,
// falling back to AUTH_SECRET. Changing it makes stored keys unreadable
// (admins then re-enter the key in AI settings).
function secretKey() {
  const secret = process.env.AI_ENCRYPTION_KEY || process.env.AUTH_SECRET
  if (!secret) throw new Error('Set AI_ENCRYPTION_KEY or AUTH_SECRET to store AI keys.')
  return createHash('sha256').update(`lumina-ai:${secret}`).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':')
}

export function decryptSecret(stored: string): string | null {
  try {
    const [version, iv, tag, data] = stored.split(':')
    if (version !== 'v1') return null
    const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
