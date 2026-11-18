import { useMemo, useState } from "react";
import { countBy, emptyFilter, GalleryFilters, matches, type FilterState } from "../components/Gallery";
import { Badge, Button, Card, ErrorNote, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useScenes } from "../hooks/useScenes";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { Environment } from "../types";

const TIMES = ["morning", "day", "noon", "evening", "sunset", "night", "moonlight"];
const WEATHERS = ["clear", "cloudy", "rain", "fog", "storm", "snow"];
const SEASONS = ["spring", "summer", "monsoon", "autumn", "winter"];
const PAGE = 24;

export function EnvironmentLibrary() {
  const { refresh, can } = useStudio();
  const environments = useLoad(() => api.get<Environment[]>("/environments"), []);
  const { scenes } = useScenes();
  const [filter, setFilter] = useState<FilterState>(emptyFilter);
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [look, setLook] = useState({ lighting: "day", weather: "clear", season: "summer", scare: 2 });
  const [target, setTarget] = useState<Record<string, string>>({});
  const [run, busy, error] = useAction();

  const all = useMemo(() => [...(environments.data ?? [])].sort((a, b) => Number(!!a.catalog_code) - Number(!!b.catalog_code)), [environments.data]); // original backgrounds first
  const categories = useMemo(() => countBy(all, (e) => e.category ?? "original"), [all]);
  const visible = useMemo(() => all.filter((e) => matches(e, filter)), [all, filter]);
  const env = all.find((e) => e.id === selected) ?? null;
  const hasScare = env?.layers.some((l) => (l.scare ?? 0) > 0) ?? false;
  const previewUrl = env ? `${media(env.preview_url ?? "")}?lighting=${look.lighting}&weather=${look.weather}&season=${look.season}&scare=${look.scare}` : "";

  return (
    <>
      <h1 className="text-2xl font-bold">Environment Library</h1>
      <p className="text-sm text-stone-600">
        {all.length} backgrounds · {visible.length} shown. New backgrounds start as <b>pending</b> until a reviewer approves them.
      </p>
      <ErrorNote message={environments.error ?? error} />
      <GalleryFilters value={filter} onChange={(f) => { setFilter(f); setShown(PAGE); }} categories={categories} noun="backgrounds" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {visible.slice(0, shown).map((e) => (
          <button key={e.id} onClick={() => setSelected(e.id)} data-testid={`environment-${e.id}`} className={`rounded-xl border bg-card p-1.5 text-left ${selected === e.id ? "border-brand" : "border-line"}`}>
            <img src={media(e.composite_url ?? e.thumbnail_url)} alt={e.name} className="aspect-video w-full rounded-lg object-cover" loading="lazy" />
            <div className="mt-1 truncate text-sm font-medium">{e.name}</div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
              <code>{e.catalog_code ?? e.id}</code> <Badge>{e.approval_status}</Badge>
            </div>
          </button>
        ))}
      </div>
      {visible.length > shown && (
        <Button variant="ghost" onClick={() => setShown(shown + PAGE)}>
          Show more ({visible.length - shown} left)
        </Button>
      )}
      {env && (
        <Card
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
            <b>Category</b> {env.category ?? "original"}
            {env.subcategory ? ` / ${env.subcategory}` : ""} · <b>Version</b> {env.version} ({env.versions.join(", ")}) · <b>Licence</b> {env.licence} · <b>Related stories</b> {env.related_stories?.join(", ") || "none recorded"}
          </p>
          <p className="mt-1 text-sm">
            <b>Tags</b> {env.tags.join(", ")} · <b>Used in</b> {scenes.filter((s) => s.environment_id === env.id).map((s) => `scene ${s.scene_number}`).join(", ") || "no scene of this story"}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
            {(
              [["Time of day", "lighting", TIMES], ["Weather", "weather", WEATHERS], ["Season", "season", SEASONS]] as const
            ).map(([label, key, options]) => (
              <label key={key} className="grid gap-0.5 text-xs text-stone-600">
                {label}
                <select aria-label={label} className={inputClass} value={look[key]} onChange={(e) => setLook({ ...look, [key]: e.target.value })}>
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ))}
            {hasScare && (
              <label className="grid gap-0.5 text-xs text-stone-600">
                Scare level
                <select aria-label="Scare level" className={inputClass} value={look.scare} onChange={(e) => setLook({ ...look, scare: Number(e.target.value) })}>
                  <option value={0}>0 gentle</option>
                  <option value={1}>1 mild</option>
                  <option value={2}>2 full</option>
                </select>
              </label>
            )}
          </div>
          <img key={previewUrl} src={previewUrl} alt={`${env.name} preview: ${look.lighting}, ${look.weather}, ${look.season}`} data-testid="environment-preview" className="mt-2 aspect-video w-full max-w-3xl rounded-lg border border-line object-cover" />
          <h3 className="mt-3 text-sm font-semibold">Layers ({env.layers.length}) · SVG masters and runtime PNGs</h3>
          <div className="mt-1 flex gap-2 overflow-x-auto pb-2">
            {env.layers.map((layer) => (
              <figure key={layer.id} className="w-40 shrink-0 rounded-lg border border-line bg-[repeating-conic-gradient(#f1ece2_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-1 text-xs">
                <img src={media(layer.url)} alt={`Layer ${layer.id}`} className="h-20 w-full object-contain" loading="lazy" />
                <figcaption className="bg-white px-1">
                  {layer.id} · {layer.type} · depth {layer.parallax} · order {layer.order}
                  {layer.animated && " · animated"}
                  {(layer.scare ?? 0) > 0 && ` · scare ${layer.scare}`}
                  {layer.svg_url && (
                    <>
                      {" · "}
                      <a className="underline" href={media(layer.svg_url)} target="_blank" rel="noreferrer">
                        SVG
                      </a>
                    </>
                  )}
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
          {env.camera_bounds && (
            <p className="text-sm">
              <b>Camera bounds</b> x {env.camera_bounds[0]}…{env.camera_bounds[2]}, y {env.camera_bounds[1]}…{env.camera_bounds[3]}
            </p>
          )}
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
      )}
    </>
  );
}
