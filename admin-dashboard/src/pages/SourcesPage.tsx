import { useEffect, useState } from "react";
import { api, NewsSource } from "../api/client";

export function SourcesPage() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    api
      .listSources()
      .then((res) => setSources(res.sources))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const toggleBlacklist = async (source: NewsSource) => {
    await api.updateSource(source.id, { isBlacklisted: !source.isBlacklisted });
    reload();
  };

  return (
    <div>
      <h1>News Sources</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Provider key</th>
              <th>Reliability</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.sourceType}</td>
                <td>{s.providerKey}</td>
                <td>{s.reliabilityScore}</td>
                <td>{s.isBlacklisted ? <span className="badge badge-rejected">Blacklisted</span> : <span className="badge badge-published">Active</span>}</td>
                <td>
                  <button onClick={() => toggleBlacklist(s)}>{s.isBlacklisted ? "Un-blacklist" : "Blacklist"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">
        New RSS/API providers are registered in the backend's <code>NewsSourceProvider</code> registry; this table manages the
        editorial metadata (reliability, blacklist status, license notes) for sources already registered there.
      </p>
    </div>
  );
}
