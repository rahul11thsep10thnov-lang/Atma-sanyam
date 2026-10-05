import { AiModel, AiTask, PrismaClient } from "@prisma/client";
import { logAdminAction } from "../../lib/auditLog";
import { LocalAiError } from "../localai/types";

export type LicenseStatus = "CLEARED" | "OVERRIDDEN" | "BLOCKED_NON_COMMERCIAL" | "BLOCKED_NOT_APPROVED";

export interface LicenseVerdict {
  status: LicenseStatus;
  productionAllowed: boolean;
  reason: string;
}

/**
 * The licence gate. Production generation requires a model whose licence was
 * verified as allowing commercial use AND that has been approved for
 * production — or an explicit, recorded administrator override. Nothing is
 * inferred from a model being "open": unknown means blocked.
 */
export function licenseVerdict(m: Pick<AiModel, "modelId" | "license" | "commercialUseAllowed" | "productionApproved" | "overrideApproved" | "overrideReason" | "overrideBy">): LicenseVerdict {
  if (m.commercialUseAllowed && m.productionApproved) return { status: "CLEARED", productionAllowed: true, reason: `${m.license}: commercial use verified and approved for production` };
  if (m.overrideApproved) return { status: "OVERRIDDEN", productionAllowed: true, reason: `Administrator override by ${m.overrideBy ?? "unknown"}: ${m.overrideReason ?? "(no reason recorded)"}` };
  if (!m.commercialUseAllowed) return { status: "BLOCKED_NON_COMMERCIAL", productionAllowed: false, reason: `${m.license}: commercial use not allowed or not verified` };
  return { status: "BLOCKED_NOT_APPROVED", productionAllowed: false, reason: `${m.license}: commercial use allowed but not yet approved for production (pending legal review)` };
}

export class LicenseGateError extends LocalAiError {
  constructor(
    readonly modelId: string,
    readonly verdict: LicenseVerdict,
  ) {
    super(`Model ${modelId} is blocked for production: ${verdict.reason}`, false, "LICENSE_BLOCKED");
    this.name = "LicenseGateError";
  }
}

export function assertProductionAllowed(m: AiModel): void {
  const v = licenseVerdict(m);
  if (!v.productionAllowed) throw new LicenseGateError(m.modelId, v);
}

export type Purpose = "production" | "preview";

export interface ResolveOptions {
  purpose: Purpose;
  /** Force a specific model (admin override on a shot, reproduction of an old render). */
  modelId?: string;
  /** Returns false when the model's backend (ComfyUI / inference API) is unreachable or not configured. */
  isAvailable?: (m: AiModel) => Promise<boolean>;
  /** Allow the built-in procedural model as the last resort (default true). */
  allowProcedural?: boolean;
}

export interface ResolvedModel {
  model: AiModel;
  verdict: LicenseVerdict;
  /** Why better-ranked models were skipped (unavailable, licence-blocked…). */
  skipped: { modelId: string; reason: string }[];
}

/** Ranking: admin default among real models → other real models by quality → procedural fallback. */
export function rankModels(models: AiModel[]): AiModel[] {
  const proc = (m: AiModel) => (m.provider === "procedural" ? 1 : 0);
  return [...models].sort((a, b) => proc(a) - proc(b) || Number(b.isDefault) - Number(a.isDefault) || b.qualityScore - a.qualityScore || a.modelId.localeCompare(b.modelId));
}

/**
 * Picks the model for a task. Production purpose never returns a model the
 * licence gate blocks; preview renders may use any enabled model, and the
 * result records that the output is not publishable.
 */
export async function resolveModel(prisma: PrismaClient, task: AiTask, opts: ResolveOptions): Promise<ResolvedModel | null> {
  const skipped: ResolvedModel["skipped"] = [];
  if (opts.modelId) {
    const m = await prisma.aiModel.findUnique({ where: { modelId: opts.modelId } });
    if (!m || m.task !== task) throw new LocalAiError(`Model ${opts.modelId} not found for task ${task}`, false, "CONFIG");
    if (!m.enabled) throw new LocalAiError(`Model ${opts.modelId} is disabled`, false, "CONFIG");
    const v = licenseVerdict(m);
    if (opts.purpose === "production" && !v.productionAllowed) throw new LicenseGateError(m.modelId, v);
    if (opts.isAvailable && !(await opts.isAvailable(m))) throw new LocalAiError(`Model ${opts.modelId} backend is unavailable`, true, "UNAVAILABLE");
    return { model: m, verdict: v, skipped };
  }
  const candidates = rankModels(await prisma.aiModel.findMany({ where: { task, enabled: true } }));
  for (const m of candidates) {
    if (m.provider === "procedural" && opts.allowProcedural === false) {
      skipped.push({ modelId: m.modelId, reason: "procedural fallback not allowed" });
      continue;
    }
    const v = licenseVerdict(m);
    if (opts.purpose === "production" && !v.productionAllowed) {
      skipped.push({ modelId: m.modelId, reason: v.reason });
      continue;
    }
    if (opts.isAvailable && !(await opts.isAvailable(m))) {
      skipped.push({ modelId: m.modelId, reason: "backend unavailable" });
      continue;
    }
    return { model: m, verdict: v, skipped };
  }
  return null;
}

export interface OverrideInput {
  approved: boolean;
  reason: string;
  adminUserId: string;
  adminName: string;
}

/** Records (or revokes) an administrator's production override for a model, with an audit entry. */
export async function setModelOverride(prisma: PrismaClient, modelId: string, input: OverrideInput): Promise<AiModel> {
  const reason = input.reason.trim();
  if (input.approved && reason.length < 10) throw new LocalAiError("An override needs a written reason (at least 10 characters)", false, "CONFIG");
  const before = await prisma.aiModel.findUnique({ where: { modelId } });
  if (!before) throw new LocalAiError(`Model ${modelId} not found`, false, "CONFIG");
  const updated = await prisma.aiModel.update({
    where: { modelId },
    data: input.approved ? { overrideApproved: true, overrideReason: reason, overrideBy: input.adminName } : { overrideApproved: false, overrideReason: null, overrideBy: null },
  });
  await logAdminAction(prisma, input.adminUserId, input.approved ? "AI_MODEL_OVERRIDE_GRANTED" : "AI_MODEL_OVERRIDE_REVOKED", "AiModel", before.id, {
    modelId,
    license: before.license,
    commercialUseAllowed: before.commercialUseAllowed,
    productionApproved: before.productionApproved,
    reason: input.approved ? reason : undefined,
  });
  return updated;
}
