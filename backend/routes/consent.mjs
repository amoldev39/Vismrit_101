import { getConsent, recordConsent, getAllConsents, getAuditLog, resetConsent } from '../database.mjs';

const CURRENT_TERMS_VERSION = '1.0';

/**
 * Extract userId from query string, header, or body.
 */
function extractUserId(req, body = null) {
  if (body && typeof body.userId === 'string' && body.userId.trim()) {
    return body.userId.trim();
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const qUserId = url.searchParams.get('userId');
    if (qUserId && qUserId.trim()) {
      return qUserId.trim();
    }
  } catch (e) {}

  const headerUserId = req.headers['x-user-id'];
  if (headerUserId && typeof headerUserId === 'string' && headerUserId.trim()) {
    return headerUserId.trim();
  }

  return 'default_user';
}

/**
 * GET /api/consent/terms
 */
export function handleGetTermsConsent(req, res) {
  const userId = extractUserId(req);
  const consent = getConsent(userId);

  sendJson(res, 200, {
    success: true,
    userId: consent.userId,
    termsAccepted: consent.termsAccepted,
    termsAcceptedAt: consent.termsAcceptedAt,
    deletionAuthorized: consent.deletionAuthorized,
    deletionAuthorizedAt: consent.deletionAuthorizedAt,
    termsVersion: consent.termsVersion,
    updatedAt: consent.updatedAt,
  });
}

/**
 * POST /api/consent/terms
 * Accepts { termsAccepted: boolean, deletionAuthorized?: boolean, userId?: string, termsVersion?: string }
 */
export function handlePostTermsConsent(req, res, body) {
  if (!body || typeof body !== 'object') {
    sendJson(res, 400, {
      success: false,
      error: 'Invalid request body. Expected JSON object.',
    });
    return;
  }

  const { termsAccepted, deletionAuthorized = false, termsVersion = CURRENT_TERMS_VERSION } = body;

  if (typeof termsAccepted !== 'boolean') {
    sendJson(res, 400, {
      success: false,
      error: "Validation error: 'termsAccepted' must be a boolean (true or false).",
    });
    return;
  }

  const userId = extractUserId(req, body);
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const record = recordConsent({
    userId,
    termsAccepted,
    deletionAuthorized: Boolean(deletionAuthorized),
    termsVersion: typeof termsVersion === 'string' && termsVersion.trim() ? termsVersion.trim() : CURRENT_TERMS_VERSION,
    ipAddress,
    userAgent,
  });

  sendJson(res, 200, {
    success: true,
    userId: record.userId,
    termsAccepted: record.termsAccepted,
    termsAcceptedAt: record.termsAcceptedAt,
    deletionAuthorized: record.deletionAuthorized,
    deletionAuthorizedAt: record.deletionAuthorizedAt,
    termsVersion: record.termsVersion,
  });
}

/**
 * GET /api/consent/all
 */
export function handleGetAllConsents(req, res) {
  const all = getAllConsents();
  sendJson(res, 200, {
    success: true,
    consents: all,
  });
}

/**
 * GET /api/consent/audit
 */
export function handleGetAuditHistory(req, res) {
  const userId = extractUserId(req);
  const logs = getAuditLog(userId);
  sendJson(res, 200, {
    success: true,
    userId,
    auditTrail: logs,
  });
}

/**
 * POST /api/consent/reset
 */
export function handleResetConsent(req, res, body) {
  const userId = extractUserId(req, body);
  resetConsent(userId);
  sendJson(res, 200, {
    success: true,
    message: `Consent reset for user: ${userId}`,
    userId,
  });
}

export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}
