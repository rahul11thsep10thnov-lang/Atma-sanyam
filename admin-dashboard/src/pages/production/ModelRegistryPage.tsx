import { useEffect, useState } from "react";
import { ModelRow, productionApi } from "../../api/production";
import { useAuth } from "../../context/AuthContext";

/**
 * Local AI model registry with licence status. Production generation only
 * uses models whose licence allows commercial use and that are approved —
 * or that an administrator explicitly overrides, with a recorded reason.
 */
export function ModelRegistryPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { role } = useAuth();
  const isSuper = role === "SUPER_ADMIN";
  const load = () => productionApi.models().then((r) => setModels(r.models)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
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
  const tasks = [...new Set(models.map((m) => m.task))];

  return (
    <div>
      <h1>Model registry</h1>
      <p className="small muted">Self-hosted models only (ComfyUI / internal inference API) plus the built-in procedural fallbacks. An open-weight model is not assumed to allow commercial use: unverified licences stay blocked for production.</p>
      {message && <p className="info">{message}</p>}
      {error && <p className="error">{error}</p>}
      {tasks.map((task) => (
        <section key={task} className="card">
          <h3>{task.replace(/_/g, " ").toLowerCase()}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Licence</th>
                <th>Production</th>
                <th>Backend</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {models
                .filter((m) => m.task === task)
                .map((m) => (
                  <tr key={m.modelId}>
                    <td>
                      <strong>{m.name}</strong>
                      <div className="small muted">
                        {m.modelId} · {m.provider}
                        {m.recommendedVramGb ? ` · ~${m.recommendedVramGb} GB VRAM` : ""}
                      </div>
                    </td>
                    <td className="small">
                      {m.licenseUrl ? (
                        <a href={m.licenseUrl} target="_blank" rel="noreferrer">
                          {m.license}
                        </a>
                      ) : (
                        m.license
                      )}
                      <div className="muted">{m.licenseVerifiedAt ? `verified ${m.licenseVerifiedAt.slice(0, 10)}` : "not verified"}</div>
                      {m.licenseNotes && <div className="muted">{m.licenseNotes}</div>}
                      {m.attributionRequired && m.attributionText && <div>Attribution: {m.attributionText}</div>}
                    </td>
                    <td className="small">
                      <span className={`badge ${m.verdict.productionAllowed ? "badge-qc-passed" : "badge-qc-needs_review"}`}>{m.verdict.status}</span>
                      <div className="muted">{m.verdict.reason}</div>
                    </td>
                    <td className="small">
                      <label className="chip">
                        <input type="checkbox" disabled={!isSuper || busy} checked={m.enabled} onChange={(e) => run(() => productionApi.updateModel(m.modelId, { enabled: e.target.checked }), `${m.modelId} ${e.target.checked ? "enabled" : "disabled"}`)} /> enabled
                      </label>
                      {m.provider !== "procedural" && (
                        <label className="chip">
                          <input type="checkbox" disabled={!isSuper || busy} checked={m.isDefault} onChange={(e) => run(() => productionApi.updateModel(m.modelId, { isDefault: e.target.checked }), `${m.modelId} default updated`)} /> default
                        </label>
                      )}
                      {m.workflow && <div className="muted">workflow {m.workflow}</div>}
                      {m.endpoint && <div className="muted">{m.endpoint}</div>}
                    </td>
                    <td>
                      {isSuper && !(m.commercialUseAllowed && m.productionApproved) && (
                        m.overrideApproved ? (
                          <button type="button" className="secondary" disabled={busy} onClick={() => run(() => productionApi.overrideModel(m.modelId, false, ""), "Override revoked")}>
                            Revoke override
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="danger"
                            disabled={busy}
                            onClick={() => {
                              const reason = window.prompt(`Override the licence gate for ${m.name}?\n\nOnly do this if you hold the rights (e.g. a purchased licence). The reason is recorded in the audit log.`);
                              if (reason) void run(() => productionApi.overrideModel(m.modelId, true, reason), "Override recorded");
                            }}
                          >
                            Override for production…
                          </button>
                        )
                      )}
                      {m.overrideApproved && <div className="small muted">by {m.overrideBy}: {m.overrideReason}</div>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
