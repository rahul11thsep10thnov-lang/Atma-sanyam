# Workers, queues and GPU hosts

All Studio work is a `GenerationJob` row with a BullMQ job behind it (Redis).
Each job has:

* a queue
* a priority
* attempts (3, exponential backoff from 5 s)
* a timeout
* progress, logs and duration
* the provider, model and GPU worker that ran it
* a dedupe key, so the same work is never queued twice

Admins can **cancel** a job: its `AbortSignal` fires, and FFmpeg or ComfyUI
polling stops. They can also **retry** it, from the Ops page or the API.

## Queues (`jobs/jobRunner.ts`)

| Queue | Job types | Default timeout | Resource |
|---|---|---|---|
| `studio` | analysis, scripts, review, PLAN_SHOTS, voices, publish | 15 min | I/O |
| `image-generation` | GENERATE_LAYER_ASSET | 15 min | GPU |
| `segmentation` | GENERATE_MASK | 10 min | GPU |
| `depth-generation` | GENERATE_DEPTH | 10 min | GPU |
| `inpainting` | INPAINT_ASSET | 10 min | GPU |
| `i2v` | RENDER_SHOT_I2V | 45 min | GPU |
| `2.5d-render` | BUILD_SCENE_PACKAGE, RENDER_SHOT | 60 min | CPU, all cores |
| `studio-render` (FFmpeg) | ASSEMBLE_MASTER_VISUAL, RENDER_LANGUAGE, RENDER_PACKAGE | 60 min | CPU |
| `qc` | SHOT_QC, FINAL_QC | 10 min | CPU |

## Worker roles (`STUDIO_WORKER_ROLES`)

| Role | Queues | Run with |
|---|---|---|
| `all` | everything, plus the news-ingestion pipeline workers | `npm run worker` (single box) |
| `pipeline` | news-ingestion pipeline workers only | `STUDIO_WORKER_ROLES=pipeline npm run worker` |
| `studio` | studio | `STUDIO_WORKER_ROLES=studio,pipeline npm run worker` (typical CPU host) |
| `render` | 2.5d-render, studio-render, qc | `npm run worker:render` |
| `gpu` | the five GPU queues | `npm run worker:gpu` |
| explicit list | e.g. `image-generation,depth-generation` | `STUDIO_WORKER_ROLES=… npm run worker:gpu` |

Concurrency per worker process:

* `studio`: `STUDIO_WORKER_CONCURRENCY`
* FFmpeg: `STUDIO_RENDER_CONCURRENCY`
* `2.5d-render`: 1, because one render already uses every core
* each GPU queue: `GPU_SLOTS_PER_WORKER` (default 1)

## GPU workers (`gpu/gpuWorker.ts`, `gpu/gpuRegistry.ts`)

A GPU host runs its inference services, bound to localhost or the private
network:

* ComfyUI, and/or
* the internal inference API

next to one `npm run worker:gpu` (or `npm run start:gpu-worker` from a
compiled build).

The worker:

1. registers in `gpu_workers`:
   * worker id
   * hostname
   * GPU name and VRAM (from `nvidia-smi` when present, otherwise `GPU_VRAM_GB` / `GPU_NAME`)
   * queues served
   * slots
   * its endpoint
2. heartbeats every `GPU_HEARTBEAT_SECONDS` with free VRAM and running jobs;
3. on SIGTERM goes `DRAINING`, finishes its current jobs, then goes `OFFLINE`.

Workers that miss heartbeats for `GPU_STALE_AFTER_SECONDS` are shown as
stale. The **scheduler snapshot** (Ops page) shows waiting and running jobs,
online workers and slots per queue. It warns when a queue has waiting jobs
but no online worker serves it.

**Scheduling is pull-based.**

* Each worker takes jobs only from the queues it serves, and only up to its
  slot count.
* VRAM is reported, but it is **not** used to place jobs.
* To route by GPU class, give hosts different queue lists. For example, a
  24 GB+ host serves `i2v,image-generation` and small GPUs serve
  `depth-generation,segmentation`.

## Scaling to 1,000+ videos/month

* **2.5D rendering is CPU work.**
  * The measured cost is ≈ 11 render-seconds per output second on 4 vCPUs.
  * 1,000 videos of 90 s ≈ 280 host-hours a month.
  * Add `worker:render` hosts as the 2.5d-render queue grows.
* **GPU load is driven by new assets.**
  * Reuse means a recurring location, character or prop is generated once.
  * The Ops page shows the reuse ratio (REUSE / MODIFY / GENERATE) and
    p50/p95 latency for each stage.
* **Per-language output is cheap.**
  * The master visual is rendered once.
  * Each language only mixes audio, burns subtitles and adds the localized
    disclosure, using FFmpeg on the render hosts.
