// The eight-step editorial workflow (docs/dadu/20-admin-cms.md). A forward
// move out of a state needs that state's sign-off permission; a send-back
// from any review state returns the item to draft and needs the same
// permission. `dadu:content:approve` is a senior sign-off accepted for every
// review step. Publishing is a separate route guarded by dadu:content:publish.
import type { Permission } from '../database/rbac.js';

export const WORKFLOW_ORDER = [
  'draft',
  'educational_review',
  'factual_review',
  'language_review',
  'cultural_review',
  'rights_review',
  'safety_review',
  'approved',
  'published',
] as const;
export type WorkflowState = (typeof WORKFLOW_ORDER)[number];

export const SIGN_OFF: Record<Exclude<WorkflowState, 'approved' | 'published'>, Permission> = {
  draft: 'dadu:content:write',
  educational_review: 'dadu:review:educational',
  factual_review: 'dadu:review:factual',
  language_review: 'dadu:review:language',
  cultural_review: 'dadu:review:cultural',
  rights_review: 'dadu:review:rights',
  safety_review: 'dadu:review:safety',
};

export function nextState(from: WorkflowState): WorkflowState | null {
  const i = WORKFLOW_ORDER.indexOf(from);
  return i >= 0 && i < WORKFLOW_ORDER.length - 1 ? (WORKFLOW_ORDER[i + 1] ?? null) : null;
}

export type TransitionCheck =
  | { ok: true; kind: 'forward' | 'send_back'; needed: Permission[] }
  | { ok: false; reason: string };

/** Which permissions (any one suffices) allow moving `from` → `to`. */
export function checkTransition(from: WorkflowState, to: WorkflowState): TransitionCheck {
  if (from === 'published') return { ok: false, reason: 'Published content is changed through unpublish, rollback or a new draft version' };
  if (to === 'published') return { ok: false, reason: 'Use the publish route' };
  if (from === 'approved') return to === 'draft' ? { ok: true, kind: 'send_back', needed: ['dadu:content:approve', 'dadu:content:publish'] } : { ok: false, reason: 'Approved content can only be published or sent back' };
  const forward = nextState(from);
  if (to === forward) {
    const needed: Permission[] = [SIGN_OFF[from as keyof typeof SIGN_OFF]];
    if (from !== 'draft') needed.push('dadu:content:approve');
    return { ok: true, kind: 'forward', needed };
  }
  if (to === 'draft' && from !== 'draft') return { ok: true, kind: 'send_back', needed: [SIGN_OFF[from as keyof typeof SIGN_OFF], 'dadu:content:approve'] };
  return { ok: false, reason: `Cannot move from ${from} to ${to}; the next step is ${forward}` };
}
