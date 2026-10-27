import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vismrit_consent.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');

// Initialize schema
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_terms_consent (
      userId TEXT PRIMARY KEY,
      termsAccepted INTEGER NOT NULL DEFAULT 0,
      termsAcceptedAt TEXT,
      deletionAuthorized INTEGER NOT NULL DEFAULT 0,
      deletionAuthorizedAt TEXT,
      termsVersion TEXT NOT NULL DEFAULT '1.0',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS consent_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      action TEXT NOT NULL,
      termsAccepted INTEGER NOT NULL,
      deletionAuthorized INTEGER NOT NULL DEFAULT 0,
      termsVersion TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      ipAddress TEXT,
      userAgent TEXT
    );
  `);

  // Safe migrations for existing databases
  try {
    db.exec(`ALTER TABLE user_terms_consent ADD COLUMN deletionAuthorized INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE user_terms_consent ADD COLUMN deletionAuthorizedAt TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE consent_audit_log ADD COLUMN deletionAuthorized INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}
}

/**
 * Get terms acceptance and deletion authorization status for a specific user.
 */
export function getConsent(userId = 'default_user') {
  const stmt = db.prepare(`
    SELECT userId, termsAccepted, termsAcceptedAt, deletionAuthorized, deletionAuthorizedAt, termsVersion, updatedAt
    FROM user_terms_consent
    WHERE userId = ?
  `);
  const record = stmt.get(userId);

  if (!record) {
    return {
      userId,
      termsAccepted: false,
      termsAcceptedAt: null,
      deletionAuthorized: false,
      deletionAuthorizedAt: null,
      termsVersion: '1.0',
      updatedAt: null,
    };
  }

  return {
    userId: record.userId,
    termsAccepted: Boolean(record.termsAccepted),
    termsAcceptedAt: record.termsAcceptedAt,
    deletionAuthorized: Boolean(record.deletionAuthorized),
    deletionAuthorizedAt: record.deletionAuthorizedAt,
    termsVersion: record.termsVersion,
    updatedAt: record.updatedAt,
  };
}

/**
 * Record terms acceptance and deletion authorization for a user.
 */
export function recordConsent({
  userId = 'default_user',
  termsAccepted,
  deletionAuthorized = false,
  termsVersion = '1.0',
  ipAddress = null,
  userAgent = null,
}) {
  const now = new Date().toISOString();
  const isTermsAccepted = termsAccepted ? 1 : 0;
  const termsAcceptedAt = isTermsAccepted ? now : null;
  const isDeletionAuthorized = deletionAuthorized ? 1 : 0;
  const deletionAuthorizedAt = isDeletionAuthorized ? now : null;

  // Upsert user_terms_consent
  const upsertStmt = db.prepare(`
    INSERT INTO user_terms_consent (userId, termsAccepted, termsAcceptedAt, deletionAuthorized, deletionAuthorizedAt, termsVersion, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      termsAccepted = excluded.termsAccepted,
      termsAcceptedAt = excluded.termsAcceptedAt,
      deletionAuthorized = excluded.deletionAuthorized,
      deletionAuthorizedAt = excluded.deletionAuthorizedAt,
      termsVersion = excluded.termsVersion,
      updatedAt = excluded.updatedAt
  `);
  upsertStmt.run(userId, isTermsAccepted, termsAcceptedAt, isDeletionAuthorized, deletionAuthorizedAt, termsVersion, now);

  // Append auditable event log
  const auditStmt = db.prepare(`
    INSERT INTO consent_audit_log (userId, action, termsAccepted, deletionAuthorized, termsVersion, timestamp, ipAddress, userAgent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const action = isTermsAccepted
    ? (isDeletionAuthorized ? 'ACCEPTED_WITH_DELETION_AUTHORIZATION' : 'ACCEPTED_TERMS_ONLY')
    : 'DECLINED_OR_CANCELLED';
  auditStmt.run(userId, action, isTermsAccepted, isDeletionAuthorized, termsVersion, now, ipAddress, userAgent);

  return {
    userId,
    termsAccepted: Boolean(isTermsAccepted),
    termsAcceptedAt,
    deletionAuthorized: Boolean(isDeletionAuthorized),
    deletionAuthorizedAt,
    termsVersion,
    updatedAt: now,
  };
}

/**
 * Get all consent records across all users
 */
export function getAllConsents() {
  const stmt = db.prepare(`
    SELECT userId, termsAccepted, termsAcceptedAt, deletionAuthorized, deletionAuthorizedAt, termsVersion, updatedAt
    FROM user_terms_consent
    ORDER BY updatedAt DESC
  `);
  const rows = stmt.all();
  return rows.map((r) => ({
    userId: r.userId,
    termsAccepted: Boolean(r.termsAccepted),
    termsAcceptedAt: r.termsAcceptedAt,
    deletionAuthorized: Boolean(r.deletionAuthorized),
    deletionAuthorizedAt: r.deletionAuthorizedAt,
    termsVersion: r.termsVersion,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Get audit trail for a user
 */
export function getAuditLog(userId = 'default_user') {
  const stmt = db.prepare(`
    SELECT id, userId, action, termsAccepted, deletionAuthorized, termsVersion, timestamp, ipAddress, userAgent
    FROM consent_audit_log
    WHERE userId = ?
    ORDER BY id DESC
  `);
  return stmt.all(userId);
}

/**
 * Reset a user's consent record
 */
export function resetConsent(userId) {
  db.prepare('DELETE FROM user_terms_consent WHERE userId = ?').run(userId);
}

// Initialize tables immediately
initSchema();
