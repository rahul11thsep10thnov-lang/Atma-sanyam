import { prisma } from "@/lib/db/prisma";
import { sendSms } from "@/lib/sms";
import { SITE_URL } from "@/lib/siteConfig";

/** Members (active paid membership, SMS on) get a text for every newly
 * published job. Failures are logged in sms_logs, never thrown. */
export async function notifyMembersOfNewJob(jobId: string, now = new Date()) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { title: true, slug: true, applicationEndDate: true } });
  if (!job) return { sent: 0, failed: 0 };
  const members = await prisma.user.findMany({ where: { membershipUntil: { gt: now }, smsAlerts: true }, select: { id: true, mobile: true }, take: 5000 });
  const last = job.applicationEndDate ? ` Last date ${job.applicationEndDate.toISOString().slice(0, 10)}.` : "";
  const text = `New job: ${job.title.slice(0, 90)}.${last} ${SITE_URL}/jobs/${job.slug} -Naukri Chayan`;
  let sent = 0;
  let failed = 0;
  for (const m of members) {
    const r = await sendSms({ to: m.mobile, kind: "alert", text, vars: { message: text }, purpose: "member:new_job", userId: m.id });
    if (r.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
