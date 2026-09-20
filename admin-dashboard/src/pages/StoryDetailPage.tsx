import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, MasterStoryDetail } from "../api/client";

export function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<MasterStoryDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    api.getStory(id).then((res) => setStory(res.story));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!story) return <p>Loading...</p>;

  const doAction = async (fn: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage(successMessage);
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const latestScript = story.scripts[0];

  return (
    <div>
      <h1>{story.title}</h1>
      <p className="muted">
        {story.eventType} · <span className={`badge badge-${story.pipelineStatus.toLowerCase()}`}>{story.pipelineStatus}</span> · relevance{" "}
        {story.familyRelevanceScore} · suitability {story.suitabilityScore} · quality {story.qualityScore}
      </p>
      {story.location && (
        <p className="muted">
          📍 {story.location.district ? `${story.location.district}, ` : ""}
          {story.location.state}
        </p>
      )}
      {story.rejectionReason && <p className="error">Rejection reason: {story.rejectionReason}</p>}

      <section className="card">
        <h2>Facts</h2>
        <p>
          <strong>What happened:</strong> {story.whatHappened}
        </p>
        {story.background && (
          <p>
            <strong>Background:</strong> {story.background}
          </p>
        )}
        {story.policeAction && (
          <p>
            <strong>Police action:</strong> {story.policeAction}
          </p>
        )}
        {story.legalStatus && (
          <p>
            <strong>Legal status:</strong> {story.legalStatus}
          </p>
        )}
        {story.currentStatus && (
          <p>
            <strong>Current status:</strong> {story.currentStatus}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Sources ({story.storySources.length})</h2>
        <ul>
          {story.storySources.map((s) => (
            <li key={s.id}>
              <strong>{s.source.name}</strong>: {s.rawArticle.headline} —{" "}
              <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                original
              </a>
            </li>
          ))}
        </ul>
      </section>

      {latestScript && (
        <section className="card">
          <h2>
            Script v{latestScript.version} ({latestScript.status})
          </h2>
          <p>{latestScript.introduction}</p>
          <p>{latestScript.sequence}</p>
          {Array.isArray(latestScript.safetyFlags) && latestScript.safetyFlags.length > 0 && (
            <div className="flags">
              <h3>Safety / moderation flags</h3>
              <ul>
                {(latestScript.safetyFlags as { rule: string; severity: string; excerpt?: string }[]).map((f, i) => (
                  <li key={i} className={f.severity === "BLOCKING" ? "flag-blocking" : "flag-warning"}>
                    [{f.severity}] {f.rule} {f.excerpt ? `— "${f.excerpt}"` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {story.videoAssets.length > 0 && (
        <section className="card">
          <h2>Video assets</h2>
          <ul>
            {story.videoAssets.map((v) => (
              <li key={v.id}>
                {v.languageCode} — {v.renderStatus} {v.durationSeconds ? `(${v.durationSeconds}s)` : ""}{" "}
                {v.storageUrl && (
                  <a href={v.storageUrl} target="_blank" rel="noreferrer">
                    view
                  </a>
                )}
                <button disabled={busy} onClick={() => doAction(() => api.regenerateAudio(story.id, v.languageCode), "Regeneration queued")}>
                  Regenerate audio/video
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Editorial actions</h2>
        <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="action-row">
          <button disabled={busy} onClick={() => doAction(() => api.approveStory(story.id, notes), "Story approved and queued for publishing")}>
            Approve
          </button>
          <button disabled={busy} className="danger" onClick={() => doAction(() => api.rejectStory(story.id, notes), "Story rejected")}>
            Reject
          </button>
          <button disabled={busy} onClick={() => doAction(() => api.regenerateScript(story.id), "Script regeneration queued")}>
            Regenerate script
          </button>
        </div>
        {message && <p className="info">{message}</p>}
      </section>

      <section className="card">
        <h2>Review history</h2>
        <ul>
          {story.adminReviews.map((r) => (
            <li key={r.id}>
              {new Date(r.createdAt).toLocaleString()} — {r.adminUser.email}: {r.action} {r.notes ? `(${r.notes})` : ""}
            </li>
          ))}
          {story.adminReviews.length === 0 && <li className="muted">No reviews yet.</li>}
        </ul>
      </section>
    </div>
  );
}
