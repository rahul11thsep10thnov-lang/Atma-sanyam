# Deployment: API, workers, render hosts and GPU hosts

> The GPU parts of this guide (ComfyUI workflows, the inference server's model
> handlers, I2V) were written without GPU access and have **not** been run
> against real models. Bring each one up in staging using the checklists below.

## Topology

```
                 ┌──────────── private network ────────────┐
 admin browser ─▶│ API (npm start)        Postgres   Redis   │
 Android app  ─▶ │   │                        ▲        ▲     │
                 │   ├─ studio+pipeline host (npm run start:worker, roles studio,pipeline)
                 │   ├─ render hosts ×N     (roles render: 2.5D + FFmpeg + QC, CPU)
                 │   └─ GPU hosts ×M        (npm run start:gpu-worker)
                 │          └─ ComfyUI :8188 and/or inference-server :8190 on 127.0.0.1
                 │   object storage (S3/R2) ◀── every worker reads and writes assets here
                 └──────────────────────────────────────────┘
```

* Only the API, and the public media URLs, face the internet.
* GPU services listen on localhost of their own host. The GPU worker beside
  them is the only client.

## Deployment sequence

1. **Data services**: PostgreSQL 16 and Redis 7 (managed, or
   `backend/docker-compose.yml` for development).
2. **Object storage**: an S3-compatible bucket. Set `STORAGE_*`.
   * Every worker must share it, because render and GPU hosts exchange
     assets through it.
3. **Backend build** on each backend host:
   ```bash
   cd backend
   npm ci
   npx prisma migrate deploy      # includes 20261005171559_cinematic_25d
   npm run prisma:seed            # languages, voices, render profiles, model registry
   npm run build
   ```
4. **API**: `npm start`.
   * Keep `STUDIO_INLINE_JOBS=false` in production.
   * Create the first super admin:
     `ADMIN_PASSWORD='…' npm run create-admin -- --email you@example.com --role SUPER_ADMIN`
5. **Studio and pipeline worker**: `STUDIO_WORKER_ROLES=studio,pipeline npm run start:worker`.
6. **Render hosts** (CPU, as many cores as possible; FFmpeg ≥ 6 with libass;
   Noto fonts for Indic subtitles in `STUDIO_FONT_DIR`):
   `STUDIO_WORKER_ROLES=render npm run start:worker`
7. **GPU hosts** (each one):
   * Install the NVIDIA driver and CUDA. `nvidia-smi` must work.
   * Start the inference services, bound to `127.0.0.1`:
     * **ComfyUI** (for `provider = comfyui` models):
       * Install the checkpoints named in each model's `config` (see
         `backend/comfyui-workflows/README.md`).
       * Run `python main.py --listen 127.0.0.1 --port 8188`.
     * **Inference server** (for `provider = http-inference` models):
       see `inference-server/README.md`. Run it on port 8190.
   * Start the GPU worker:
     ```bash
     GPU_WORKER_ID=gpu-a1 STUDIO_WORKER_ROLES=gpu \
     COMFYUI_BASE_URL=http://127.0.0.1:8188 \
     INFERENCE_BASE_URL=http://127.0.0.1:8190 INFERENCE_API_KEY=… INFERENCE_SIGNING_SECRET=… \
     DATABASE_URL=… REDIS_URL=… STORAGE_…=… \
     npm run start:gpu-worker
     ```
   * Optional: `GPU_SLOTS_PER_WORKER` (jobs at once), `GPU_VRAM_GB` /
     `GPU_NAME` (when `nvidia-smi` is unavailable), and an explicit queue
     list to specialise the host.
8. **Model registry** (admin → Production → Models): enable and default the
   models now served (see `model-registry.md`).
   * Until you do, every stage uses the procedural providers.
   * That output is publishable only after an editor approves it.
9. **Optional I2V**:
   * Set `LOCAL_I2V_ENABLED=true` on **every** backend host: the API and all
     workers. Planning and the job advancer both read it.
   * Then enable `wan2.1-i2v-14b-480p`.
   * `RENDER_SHOT_I2V` runs on the GPU hosts serving `i2v`. It renders the
     first frame with the 2.5D engine, then calls the video model.
10. **Admin dashboard**:
    * `cd admin-dashboard && VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build`
    * Serve `dist/` behind HTTPS.

## Environment variables added by the cinematic Studio

| Variable | Default | Where | Meaning |
|---|---|---|---|
| `STUDIO_DEFAULT_FPS` / `STUDIO_ORIENTATION` | 30 / portrait | API | Defaults for new projects (1080×1920 @ 30) |
| `COMFYUI_BASE_URL`, `COMFYUI_API_KEY` | — | GPU worker | ComfyUI endpoint (private host, or HTTPS + key) |
| `COMFYUI_WORKFLOW_DIR` | `backend/comfyui-workflows` | GPU worker | Workflow templates |
| `INFERENCE_BASE_URL`, `INFERENCE_API_KEY`, `INFERENCE_SIGNING_SECRET` | — | GPU worker | Internal inference API and its signing secret |
| `LOCAL_AI_TIMEOUT_MS` | 600000 | GPU worker | Per-request timeout for image/mask/depth/inpaint |
| `LOCAL_I2V_ENABLED` | false | **every backend host** | Optional I2V; read by planning and by the job advancer, so set it the same everywhere |
| `LOCAL_I2V_TIMEOUT_MS` | 1800000 | GPU worker | I2V request timeout |
| `GPU_WORKER_ID` | random | GPU worker | Stable id shown on the Ops page |
| `GPU_SLOTS_PER_WORKER` | 1 | GPU worker | Concurrent jobs per GPU queue |
| `GPU_HEARTBEAT_SECONDS`, `GPU_STALE_AFTER_SECONDS` | 15, 90 | GPU worker / API | Heartbeat and staleness |
| `GPU_VRAM_GB`, `GPU_NAME` | — | GPU worker | Telemetry fallback without `nvidia-smi` |
| `ENGINE_RENDER_THREADS` | 0 (= cores − 1) | render host | 2.5D render worker threads |
| `ENGINE_PREVIEW_PROFILE` | `preview-540x960-30` | API | Shot Inspector preview size (must be a preview profile) |

Secrets are environment-only: never commit `.env`, and never put them in
the Android app.

## Health checks

* **Ops page** (Production → Ops) shows:
  * queue depth and failures
  * p50/p95 per stage
  * render throughput per profile
  * reuse ratio
  * GPU workers (heartbeat, VRAM, running jobs)
  * warnings for queues nobody serves
* ComfyUI: `curl http://127.0.0.1:8188/system_stats` on the GPU host.
* Inference server:
  `curl -H "Authorization: Bearer $INFERENCE_API_KEY" http://127.0.0.1:8190/v1/health`

The localized "Visual reconstruction" disclosure is always burned into every
cinematic language render. There is deliberately no setting to turn it off.
