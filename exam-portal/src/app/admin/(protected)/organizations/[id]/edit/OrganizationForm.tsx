"use client";

import { useActionState } from "react";
import { updateOrganizationAction, type FormState } from "../../actions";

const input = "mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";
const label = "block text-xs font-medium text-slate-600";

export function OrganizationForm({ org, types, states }: {
  org: { id: string; name: string; shortName: string | null; organizationType: string | null; stateId: string | null; website: string | null; description: string | null };
  types: string[];
  states: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateOrganizationAction, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <input type="hidden" name="id" value={org.id} />
      {state.error ? <p role="alert" className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <label className={`${label} md:col-span-2`}>Name<input name="name" defaultValue={org.name} className={input} required /></label>
      <label className={label}>Short name / acronym<input name="shortName" defaultValue={org.shortName ?? ""} className={input} /></label>
      <label className={label}>Type<select name="organizationType" defaultValue={org.organizationType ?? ""} className={input}><option value="">—</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
      <label className={label}>State<select name="stateId" defaultValue={org.stateId ?? ""} className={input}><option value="">— (central / none) —</option>{states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className={label}>Website<input name="website" type="url" defaultValue={org.website ?? ""} className={input} /></label>
      <label className={`${label} md:col-span-2`}>Description<textarea name="description" rows={3} defaultValue={org.description ?? ""} className={input} /></label>
      <div className="md:col-span-2"><button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">{pending ? "Saving…" : "Save"}</button><span className="ml-3 text-xs text-slate-500">Saving confirms an auto-created organization.</span></div>
    </form>
  );
}
