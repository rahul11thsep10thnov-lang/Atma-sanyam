# Troubleshooting the cinematic Studio

Start with **Production → Ops**. It shows:

* queue depth and failures
* p50/p95 per stage
* render throughput per profile
* GPU workers
* warnings for queues that have waiting jobs but no worker

Every job's log, error, attempts, provider, model and GPU worker are on the
Ops page and in the Shot Inspector's job list.

## A story is stuck

| Symptom | Likely cause | Fix |
|---|---|---|
| Shots stay `GENERATING_ASSETS`; Ops warns "no online GPU worker serves this queue" | No `worker:gpu` running for that queue | Start a GPU worker with that queue in its roles, or let a CPU worker take it: add the queue name to a CPU host's `STUDIO_WORKER_ROLES` so the procedural fallback runs there |
| Jobs stay `PENDING` on every queue | Workers not running, or not reaching Redis | Check `REDIS_URL` and the worker logs. For local testing only, `STUDIO_INLINE_JOBS=true` runs jobs in the API process |
| `2.5d-render` queue grows steadily | Not enough render capacity | Add `worker:render` hosts. Check Ops → rendering → per-profile seconds per output second |
| Shot `FAILED` with "Missing asset" / `IncompletePackageError` | An asset failed after all retries | Asset library → filter FAILED → **Regenerate** |
| Job `FAILED` after a timeout | Stage exceeded its queue timeout (e.g. 15 min for image generation) | Look for a slow GPU or an overloaded host. Retry from Ops. Large I2V clips need `LOCAL_I2V_TIMEOUT_MS` raised |

## Publishing is blocked

The **CAN_PUBLISH** gate lists each blocking issue on the story's QC report.

| Issue | Meaning | Fix |
|---|---|---|
| `cinematic_placeholder_asset` | A layer still uses procedural or placeholder art nobody approved | Asset library → review → **Approve**, or **Regenerate** with a local model |
| `cinematic_licence` | A layer comes from a model that is not licence-cleared (or an upload without commercial rights) | Regenerate the asset with a cleared model. Never override a licence without legal sign-off |
| `cinematic_shot_rendered` / `cinematic_shot_qc` | A shot has no current render, or has not passed shot QC | Wait for the queue, or open the shot and re-render |
| `cinematic_black_frames`, `cinematic_resolution`, `cinematic_fps`, `cinematic_codec` | Shot QC probe failed | Re-render. If it repeats, check FFmpeg on the render host (`ffmpeg -version` ≥ 6, libx264) |
| `cinematic_master_visual` | The master visual is missing, or older than the current shot renders | It is reassembled automatically once all shots pass. Check the `studio-render` queue |
| `cinematic_safety_*`, `cinematic_no_minors` | A RESTRICTED or SENSITIVE rule was violated by an override | Remove the override (e.g. `silhouette: false` on a sensitive shot) |

## Local AI errors

| Error | Cause | Fix |
|---|---|---|
| `… is not an internal host. Public endpoints require HTTPS and an API key.` | The endpoint policy refused a public URL | Use the GPU host's private address or localhost. A public endpoint needs HTTPS and an API key |
| `Model … is blocked for production` (`LICENSE_BLOCKED`) | The resolved or pinned model is not cleared | See `model-registry.md`. Production never falls back to a blocked model silently |
| `INFERENCE_SIGNING_SECRET is required` | HTTP inference configured without a secret | Set the same secret on the GPU worker and the inference server |
| Inference `HTTP 401` | Wrong API key or secret, or clock skew over 300 s | Compare the env values. Run NTP on both hosts |
| Inference `HTTP 409 replayed request` | Something re-sent an identical signed request (e.g. a retrying proxy) | Disable proxy-level retries. The job runner retries with fresh signatures |
| Inference `HTTP 429` / `503` | GPU busy or out of memory | Retried automatically. Lower `INFERENCE_SLOTS`, raise `INFERENCE_MAX_WAITING`, enable `INFERENCE_CPU_OFFLOAD`, or add GPUs |
| `Workflow template is missing values for: …` | A ComfyUI workflow uses a placeholder the adapter does not fill | Fix the template in `backend/comfyui-workflows/`, or add the value to the model's `config` |
| `Cannot load workflow …` | Wrong `COMFYUI_WORKFLOW_DIR`, or a missing file | Point it at `backend/comfyui-workflows`. The compiled build finds it automatically |
| Asset provenance shows `procedural` although a model is enabled | The GPU service health check failed, so the stage fell back (logged on the job) | Check `/system_stats` or `/v1/health` on the GPU host. Availability is cached for 30 s |
| Render notes `I2V fallback: …` | The I2V clip failed, and the shot was rendered in 2.5D instead | Read the reason on the render. The shot is still valid |

## Visual problems

| Symptom | Fix |
|---|---|
| Blurry character in close-ups; shot QC warns `asset_resolution` | The asset is smaller than its on-screen size. Regenerate it: new assets are generated at their size tier's maximum |
| Stretching at the edge of the background during big camera moves | Depth map errors. In the Shot Inspector, lower the camera intensity, or reduce the background layer's depth. A better depth model (registry) helps too |
| Character "slides" against the floor | The layer is not ground-locked: its placement anchor must be at the feet. Check the layer placement override |
| Indic subtitles show boxes | Install Noto fonts on the render hosts and set `STUDIO_FONT_DIR` |
| Everything re-rendered after an upgrade | Expected when `ENGINE_VERSION` changes: it is part of the render cache key |
| Shot Inspector preview returns 429 | Two previews are already rendering in this API process. Wait a moment |

## GPU workers

* **Worker shows stale.** It missed heartbeats for `GPU_STALE_AFTER_SECONDS`.
  The process died or lost the database. Restart it. Jobs it held are
  retried by BullMQ after their lock expires.
* **No GPU name or VRAM shown.** `nvidia-smi` is not on the PATH. Set
  `GPU_NAME` and `GPU_VRAM_GB`.
* **Drain a host for maintenance.** Send SIGTERM. The worker goes
  `DRAINING`, finishes its current jobs, then goes `OFFLINE`.
