import { useEffect, useState } from "react";
import { api, PipelineStats } from "../api/client";

export function DashboardPage() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p>Loading...</p>;

  const { funnel } = stats;

  return (
    <div>
      <h1>Pipeline Dashboard</h1>
      <section className="stat-grid">
        <StatCard label="Articles collected" value={funnel.articlesCollected} />
        <StatCard label="Articles rejected" value={funnel.articlesRejected} />
        <StatCard label="Pending review" value={funnel.storiesPendingReview} />
        <StatCard label="Stories approved" value={funnel.storiesApproved} />
        <StatCard label="Videos generated" value={funnel.videosGenerated} />
        <StatCard label="Videos published" value={funnel.videosPublished} />
        <StatCard label="Videos failed" value={funnel.videosFailed} />
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Most viewed stories</h2>
          {stats.mostViewedStories.length === 0 ? (
            <p className="muted">No views recorded yet.</p>
          ) : (
            <ul>
              {stats.mostViewedStories.map((s) => (
                <li key={s.videoAssetId}>
                  {s.title} — <strong>{s.views}</strong> views
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Views by category</h2>
          {stats.viewsByCategory.length === 0 ? (
            <p className="muted">No views recorded yet.</p>
          ) : (
            <ul>
              {stats.viewsByCategory.map((c) => (
                <li key={c.category}>
                  {c.category} — <strong>{c.views}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Views by language</h2>
          {stats.viewsByLanguage.length === 0 ? (
            <p className="muted">No views recorded yet.</p>
          ) : (
            <ul>
              {stats.viewsByLanguage.map((l) => (
                <li key={l.language}>
                  {l.language} — <strong>{l.views}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
