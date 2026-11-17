import { useState } from "react";
import { Badge, Button, Card, ErrorNote, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useScenes } from "../hooks/useScenes";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { Environment } from "../types";

export function EnvironmentLibrary() {
  const { refresh, can } = useStudio();
  const environments = useLoad(() => api.get<Environment[]>("/environments"), []);
  const { scenes } = useScenes();
  const [target, setTarget] = useState<Record<string, string>>({});
  const [run, busy, error] = useAction();
  return (
    <>
      <h1 className="text-2xl font-bold">Environment Library</h1>
      <ErrorNote message={environments.error ?? error} />
      {environments.data?.map((env) => (
        <Card
          key={env.id}
          title={
            <span>
              {env.name} <code className="text-xs">{env.id}</code> <Badge>{env.approval_status}</Badge>
            </span>
          }
          actions={
            can("reviewer") && env.approval_status !== "approved" ? (
              <Button variant="ghost" disabled={busy} onClick={() => run(async () => { await api.post(`/assets/environment/${env.id}/approval`, { status: "approved" }); environments.reload(); })}>
                Approve
              </Button>
            ) : undefined
          }
        >
          <p className="text-sm text-stone-600">{env.description}</p>
          <p className="mt-1 text-sm">
            <b>Tags</b> {env.tags.join(", ")} · <b>Lighting</b> {env.lighting_presets.join(", ")} · <b>Used in</b>{" "}
            {scenes.filter((s) => s.environment_id === env.id).map((s) => `scene ${s.scene_number}`).join(", ") || "no scene of this story"}
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {env.layers.map((layer) => (
              <figure key={layer.id} className="w-40 shrink-0 rounded-lg border border-line bg-[repeating-conic-gradient(#f1ece2_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-1 text-xs">
                <img src={media(layer.url)} alt={`Layer ${layer.id}`} className="h-20 w-full object-contain" loading="lazy" />
                <figcaption className="bg-white px-1">
                  {layer.id} · {layer.type} · depth {layer.parallax}
                  {layer.animated && " · animated"}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="text-sm">
            <b>Anchors</b>{" "}
            {Object.entries(env.anchors).map(([name, a]) => (
              <span key={name} className="mr-2 inline-block">
                <code>{name}</code> <span className="text-stone-500">({a.features.join(", ")})</span>
              </span>
            ))}
          </p>
          {can("producer") && scenes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <select aria-label={`Scene to move to ${env.name}`} className={`${inputClass} max-w-xs`} value={target[env.id] ?? ""} onChange={(e) => setTarget({ ...target, [env.id]: e.target.value })}>
                <option value="">Use this environment in…</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    Scene {s.scene_number}: {s.title}
                  </option>
                ))}
              </select>
              <Button disabled={busy || !target[env.id]} onClick={() => run(async () => { await api.patch(`/scenes/${target[env.id]}`, { environment_id: env.id }); await refresh(); })}>
                Assign
              </Button>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
