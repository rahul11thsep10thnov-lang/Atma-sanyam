import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, MasterStorySummary } from "../api/client";

const STATUS_OPTIONS = [
  "",
  "COLLECTED",
  "AI_CLASSIFIED",
  "DUPLICATE_CHECKED",
  "QUALITY_CHECKED",
  "SCRIPT_GENERATED",
  "SAFETY_CHECKED",
  "PENDING_REVIEW",
  "APPROVED",
  "VIDEO_GENERATED",
  "PUBLISHED",
  "REJECTED",
  "FAILED",
];

export function StoriesPage() {
  const [status, setStatus] = useState("");
  const [stories, setStories] = useState<MasterStorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .listStories(status || undefined)
      .then((res) => setStories(res.stories))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1>Stories</h1>
      <div className="toolbar">
        <label>
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || "All"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Relevance</th>
              <th>Suitability</th>
              <th>Quality</th>
              <th>Sources</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stories.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.eventType}</td>
                <td>
                  <span className={`badge badge-${s.pipelineStatus.toLowerCase()}`}>{s.pipelineStatus}</span>
                </td>
                <td>{s.familyRelevanceScore}</td>
                <td>{s.suitabilityScore}</td>
                <td>{s.qualityScore}</td>
                <td>{s._count?.storySources ?? 1}</td>
                <td>
                  <Link to={`/stories/${s.id}`}>View</Link>
                </td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  No stories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
