import { useEffect, useState } from "react";
import { api, Thresholds } from "../api/client";

export function ConfigPage() {
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getThresholds().then((res) => setThresholds(res.thresholds));
  }, []);

  if (!thresholds) return <p>Loading...</p>;

  const save = async () => {
    const res = await api.updateThresholds(thresholds);
    setThresholds(res.thresholds);
    setMessage("Thresholds saved.");
  };

  return (
    <div>
      <h1>Pipeline Configuration</h1>
      <section className="card">
        <h2>Score thresholds</h2>
        <p className="muted">Only stories meeting all applicable thresholds proceed through the pipeline (spec §2/§13/§29).</p>

        <label>
          Minimum family relevance score
          <input
            type="number"
            min={0}
            max={100}
            value={thresholds.minFamilyRelevanceScore}
            onChange={(e) => setThresholds({ ...thresholds, minFamilyRelevanceScore: Number(e.target.value) })}
          />
        </label>
        <label>
          Minimum video suitability score (STORY_VIDEO_SUITABILITY_SCORE)
          <input
            type="number"
            min={0}
            max={100}
            value={thresholds.minVideoSuitabilityScore}
            onChange={(e) => setThresholds({ ...thresholds, minVideoSuitabilityScore: Number(e.target.value) })}
          />
        </label>
        <label>
          Minimum overall quality score
          <input
            type="number"
            min={0}
            max={100}
            value={thresholds.minQualityScore}
            onChange={(e) => setThresholds({ ...thresholds, minQualityScore: Number(e.target.value) })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={thresholds.autoPublishEnabled}
            onChange={(e) => setThresholds({ ...thresholds, autoPublishEnabled: e.target.checked })}
          />
          Auto-publish low-risk, non-sensitive stories without human review
        </label>

        <button onClick={save}>Save</button>
        {message && <p className="info">{message}</p>}
      </section>
    </div>
  );
}
