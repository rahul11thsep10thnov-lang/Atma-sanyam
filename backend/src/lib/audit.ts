import type { Db } from '../database/client.js';
import { auditLogs } from '../database/schema.js';
import { log } from './logger.js';

/** Persist an audit record and emit the matching structured log line. */
export async function audit(
  db: Db,
  adminId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLogs).values({
    adminId,
    actor: adminId ? 'admin' : 'system',
    action,
    entityType,
    entityId,
    details: details ?? null,
  });
  log.info(action, { entityType, entityId, adminId, ...(details ?? {}) });
}
