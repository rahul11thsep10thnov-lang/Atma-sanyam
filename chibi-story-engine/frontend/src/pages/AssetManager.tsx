import { useState, type FormEvent } from "react";
import { Badge, Button, Card, ErrorNote, Field, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { Asset } from "../types";

const TYPES = ["", "character", "environment", "component", "prop", "effect", "music", "sound_effect"];

export function AssetManager() {
  const { can } = useStudio();
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const assets = useLoad(() => api.get<Asset[]>(`/assets?${new URLSearchParams({ ...(type && { asset_type: type }), ...(query && { q: query }) })}`), [type, query]);
  const [run, busy, error] = useAction();
  const [checked, setChecked] = useState<Record<string, string>>({});
  const [upload, setUpload] = useState({ asset_id: "", name: "", asset_type: "prop", tags: "" });
  const [file, setFile] = useState<File | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    run(async () => {
      const form = new FormData();
      Object.entries(upload).forEach(([k, v]) => form.append(k, v));
      form.append("file", file);
      await api.upload("/assets", form);
      setUpload({ asset_id: "", name: "", asset_type: upload.asset_type, tags: "" });
      setFile(null);
      assets.reload();
    });
  }

  const verify = (a: Asset) =>
    run(async () => {
      const r = await api.get<{ intact: boolean; problems: { file: string; problem: string }[] }>(`/assets/${a.asset_type}/${a.id}/verify`);
      setChecked((c) => ({ ...c, [a.id]: r.intact ? "intact" : r.problems.map((p) => `${p.file}: ${p.problem}`).join("; ") }));
    });

  return (
    <>
      <h1 className="text-2xl font-bold">Asset Manager</h1>
      <Card>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
          <Field label="Type">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || "all"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Search by id, name, alias or tag">
            <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="monkey_001, बंदर, river…" />
          </Field>
          <Button type="submit">Search</Button>
        </form>
      </Card>
      <ErrorNote message={assets.error ?? error} />
      <Card title={`${assets.data?.length ?? 0} assets`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-stone-500">
              <tr>
                <th className="p-2">Asset</th>
                <th className="p-2">Type</th>
                <th className="p-2">Version</th>
                <th className="p-2">Approval</th>
                <th className="p-2">Licence</th>
                <th className="p-2">Files</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.data?.map((a) => (
                <tr key={`${a.asset_type}/${a.id}`} className="border-t border-line align-middle">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {a.thumbnail_url && <img src={media(a.thumbnail_url)} alt="" className="h-10 w-10 rounded object-contain" loading="lazy" />}
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <code className="text-xs">{a.id}</code>
                      </div>
                    </div>
                    {a.audio_url && <audio controls preload="none" className="mt-1 h-8 w-56" src={media(a.audio_url)} />}
                  </td>
                  <td className="p-2">{a.asset_type}</td>
                  <td className="p-2">
                    v{a.version}
                    {a.versions.length > 1 && <span className="text-xs text-stone-500"> of {a.versions.length}</span>}
                  </td>
                  <td className="p-2">
                    <Badge>{a.approval_status}</Badge>
                  </td>
                  <td className="p-2">{a.licence}</td>
                  <td className="p-2">{a.file_count}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button variant="ghost" disabled={busy} onClick={() => verify(a)}>
                        Verify
                      </Button>
                      {can("reviewer") && a.approval_status !== "approved" && (
                        <Button variant="ghost" disabled={busy} onClick={() => run(async () => { await api.post(`/assets/${a.asset_type}/${a.id}/approval`, { status: "approved" }); assets.reload(); })}>
                          Approve
                        </Button>
                      )}
                      {checked[a.id] && <Badge tone={checked[a.id] === "intact" ? "pass" : "error"}>{checked[a.id]}</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {can("producer") && (
        <Card title="Upload a prop or a sound">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
            <Field label="Asset id" hint="An existing id creates a new version">
              <input className={inputClass} required pattern="[a-z0-9][a-z0-9_\-]*" value={upload.asset_id} onChange={(e) => setUpload({ ...upload, asset_id: e.target.value })} />
            </Field>
            <Field label="Name">
              <input className={inputClass} required value={upload.name} onChange={(e) => setUpload({ ...upload, name: e.target.value })} />
            </Field>
            <Field label="Type">
              <select className={inputClass} value={upload.asset_type} onChange={(e) => setUpload({ ...upload, asset_type: e.target.value })}>
                <option value="prop">Prop (PNG or JPEG)</option>
                <option value="sound_effect">Sound effect (WAV)</option>
                <option value="music">Music (WAV)</option>
              </select>
            </Field>
            <Field label="Tags" hint="comma-separated">
              <input className={inputClass} value={upload.tags} onChange={(e) => setUpload({ ...upload, tags: e.target.value })} />
            </Field>
            <Field label="File" hint="Up to 25 MB">
              <input className={inputClass} type="file" required accept={upload.asset_type === "prop" ? "image/png,image/jpeg" : "audio/wav"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <div className="md:col-span-5">
              <Button type="submit" disabled={busy || !file}>
                Upload
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
