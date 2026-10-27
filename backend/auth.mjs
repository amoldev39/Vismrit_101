import crypto from 'node:crypto';
import { getUser } from './database.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'vismrit-privacy-sentinel-secret-key-2026';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid format' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Recreate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Invalid token payload JSON' };
  }
}

/**
 * Extracts and verifies authentication from request headers.
 * Never trusts a user ID supplied in request body or params.
 */
export function authenticateRequest(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  let token = null;

  if (authHeader) {
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = String(authHeader).trim();
    }
  }

  if (!token) {
    return {
      authenticated: false,
      status: 401,
      error: 'Authentication required. Missing Bearer token in Authorization header.',
    };
  }

  const result = verifyToken(token);
  if (!result.valid) {
    return {
      authenticated: false,
      status: 401,
      error: `Unauthorized: ${result.error}`,
    };
  }

  const userId = result.payload.sub;
  if (!userId) {
    return {
      authenticated: false,
      status: 401,
      error: 'Unauthorized: Token payload does not contain user identifier (sub).',
    };
  }

  const user = getUser(userId);
  if (!user) {
    return {
      authenticated: false,
      status: 401,
      error: 'Unauthorized: Authenticated user no longer exists in database.',
    };
  }

  return {
    authenticated: true,
    user,
    userId: user.id,
  };
}
