"use server";

import { redirect } from "next/navigation";
import { requireAdminApi } from "@/lib/auth/session";
import { retryFailedAlerts } from "@/lib/alerts/subscriptions";
import { recordAuditLog } from "@/lib/services/auditLog";

export async function retryFailedAlertsAction() {
  const admin = await requireAdminApi(["SUPER_ADMIN", "EDITOR"]);
  const r = await retryFailedAlerts();
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "AlertDelivery", newValue: { retried: r.retried, sent: r.sent } });
  redirect(`/admin/alerts?retried=${r.retried}&sent=${r.sent}&t=${Date.now()}`);
}
