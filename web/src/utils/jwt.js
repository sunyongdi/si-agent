const LOCAL_SECRET = 'si-agent-local-signing-key'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToB64url(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToStr(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return decoder.decode(bytes)
}

async function signHmacSha256(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return bytesToB64url(new Uint8Array(sig))
}

export const JWT_TTL_SECONDS = 7 * 24 * 3600

export async function createJwt(payload, expiresInSec = JWT_TTL_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSec }
  const h = bytesToB64url(encoder.encode(JSON.stringify(header)))
  const p = bytesToB64url(encoder.encode(JSON.stringify(body)))
  const s = await signHmacSha256(`${h}.${p}`, LOCAL_SECRET)
  return `${h}.${p}.${s}`
}

export function decodeJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(b64urlToStr(parts[1]))
  } catch {
    return null
  }
}

export function isJwtExpired(token) {
  const payload = decodeJwt(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 <= Date.now()
}

export function jwtExpiresAt(token) {
  const payload = decodeJwt(token)
  if (!payload?.exp) return null
  return payload.exp * 1000
}
