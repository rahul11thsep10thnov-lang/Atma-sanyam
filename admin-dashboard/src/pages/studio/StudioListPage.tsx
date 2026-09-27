import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { studioApi, StudioStorySummary } from "../../api/studio";

const STATUSES = ["", "DRAFT", "AI_REVIEW", "ADMIN_REVIEW", "APPROVED", "RENDERED", "PUBLISHED", "REJECTED"];

export function StudioListPage() {
  const [status, setStatus] = useState("");
  const [stories, setStories] = useState<StudioStorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      studioApi
        .list(status || undefined)
        .then((res) => !cancelled && setStories(res.stories))
        .catch((e) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));
    load();
    const timer = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status]);

  return (
    <div>
      <div className="page-header">
        <h1>Video Studio</h1>
        <Link className="button-link" to="/studio/new">
          + New story
        </Link>
      </div>
      <p className="muted">Turn an article into a factual, multilingual animated video (1–5 minutes). Nothing is published without an editor.</p>
      <div className="toolbar">
        <label>
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>QC</th>
              <th>Languages</th>
              <th>Rendered</th>
              <th>Jobs</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/studio/${s.id}`}>{s.title}</Link>
                  {s.isSensitive && <span className="badge badge-sensitive">sensitive</span>}
                </td>
                <td>
                  <span className={`badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
                </td>
                <td>
                  <span className={`badge badge-qc-${s.qcStatus.toLowerCase()}`}>{s.qcStatus}</span>
                </td>
                <td>{s.languages.join(", ")}</td>
                <td>{s.renderedLanguages.join(", ") || "—"}</td>
                <td>
                  {s.activeJobs > 0 && <span className="badge badge-approved">{s.activeJobs} running</span>}
                  {s.failedJobs > 0 && <span className="badge badge-failed">{s.failedJobs} failed</span>}
                </td>
                <td className="muted">{new Date(s.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No studio stories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
