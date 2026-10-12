import type { Db } from '../database/client.js';
import { auditLogs } from '../database/schema.js';

export async function audit(
  db: Db,
  adminId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLogs).values({ adminId, action, entityType, entityId, details: details ?? null });
}
