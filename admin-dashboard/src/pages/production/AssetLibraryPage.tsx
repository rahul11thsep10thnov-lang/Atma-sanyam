import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AssetRow, productionApi } from "../../api/production";
import { useAuth } from "../../context/AuthContext";

/** Reusable visual assets (locations, characters, props): approve placeholder art, regenerate, replace, reject. */
export function AssetLibraryPage() {
  const [params, setParams] = useSearchParams();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { role } = useAuth();
  const filter = { role: params.get("role") ?? "", status: params.get("status") ?? "", placeholder: params.get("placeholder") === "true" ? true : undefined, storyId: params.get("storyId") ?? undefined };
  const load = useCallback(() => productionApi.assets(filter).then((r) => setAssets(r.assets)).catch((e) => setError(e.message)), [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMessage(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  return (
    <div>
      <h1>Asset library</h1>
      <p className="small muted">Assets are reused across shots and stories (REUSE ▸ MODIFY ▸ GENERATE). Placeholder art from the offline generator must be approved by an editor — or regenerated with a licence-cleared local model — before a story can be published.</p>
      <div className="action-row wrap">
        <select value={filter.role} onChange={(e) => setParam("role", e.target.value)}>
          <option value="">all roles</option>
          {["background", "midground", "character", "prop", "foreground"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={filter.status} onChange={(e) => setParam("status", e.target.value)}>
          <option value="">any status</option>
          {["REQUIRED", "GENERATING", "READY", "APPROVED", "REJECTED", "FAILED"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <label className="chip">
          <input type="checkbox" checked={!!filter.placeholder} onChange={(e) => setParam("placeholder", e.target.checked ? "true" : "")} /> placeholders only
        </label>
        {filter.storyId && (
          <button type="button" className="secondary" onClick={() => setParam("storyId", "")}>
            all stories
          </button>
        )}
        <button
          type="button"
          disabled={busy || !assets.some((a) => a.status === "READY")}
          onClick={() => run(async () => {
            for (const a of assets.filter((x) => x.status === "READY")) await productionApi.approveAsset(a.id);
          }, "Approved all ready assets in this view")}
        >
          Approve all shown
        </button>
      </div>
      {message && <p className="info">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="asset-grid">
        {assets.map((a) => (
          <div key={a.id} className="card asset-card">
            {a.url && a.kind !== "RIG" ? <img src={a.url} alt="" className="asset-preview" /> : <div className="asset-preview placeholder-thumb">{a.kind === "RIG" ? "cut-out rig" : a.status}</div>}
            <strong className="small">{a.name}</strong>
            <div className="small muted">
              {a.role} · {a.width}×{a.height} · used by {a._count.layers} layer(s)
            </div>
            <div>
              <span className={`badge badge-asset-${a.status.toLowerCase()}`}>{a.status}</span>
              {a.isPlaceholder && <span className="badge badge-sensitive">placeholder</span>}
            </div>
            {a.failureReason && <div className="small error">{a.failureReason}</div>}
            <div className="action-row wrap">
              <button type="button" disabled={busy || a.status !== "READY"} onClick={() => run(() => productionApi.approveAsset(a.id), `Approved ${a.name}`)}>
                Approve
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => run(() => productionApi.regenerateAsset(a.id), `Regenerating ${a.name}`)}>
                Regenerate
              </button>
              {role === "SUPER_ADMIN" && a.kind !== "RIG" && (
                <label className="button-like secondary small">
                  Replace…
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const license = window.prompt("Licence / source of this image (you assert the rights):", "Commissioned artwork, all rights");
                      if (!license) return;
                      const commercial = window.confirm("Is commercial use of this image allowed?");
                      void run(() => productionApi.replaceAsset(a.id, f, license, commercial), `Replaced ${a.name}`);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
