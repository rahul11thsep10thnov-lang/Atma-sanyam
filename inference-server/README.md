# Reference GPU inference server

A small FastAPI service that runs open-weight models on a GPU host for the
cinematic Studio: depth, segmentation, inpainting, image generation and
optional image-to-video. The backend calls it through
`backend/src/studio/localai/http/InferenceClient.ts` for models whose
registry provider is `http-inference`. Models registered as `comfyui` go to
ComfyUI instead (`backend/comfyui-workflows/`).

> **Status: the protocol and security layer is tested, but the model handlers are not.**
> This repository was built without GPU access. The auth/signature/replay/size/allowlist
> layer is covered by `tests/test_api.py`, and was checked over real HTTP against the
> Node client. The model handlers in `app/handlers.py` follow the libraries' documented
> APIs but **have never been run against real weights**. Bring each one up with the
> checklist below before you enable its model in the registry.

## What it serves

| Backend `modelId` | Task (URL) | Implementation | Weights (default) |
|---|---|---|---|
| `depth-anything-v2-small` | `/v1/depth` | transformers depth-estimation | `depth-anything/Depth-Anything-V2-Small-hf` |
| `midas-dpt-hybrid` | `/v1/depth` | transformers depth-estimation | `Intel/dpt-hybrid-midas` |
| `birefnet` | `/v1/segmentation` | transformers + remote code (pinned revision required) | `ZhengPeng7/BiRefNet` |
| `big-lama` | `/v1/inpainting` | TorchScript (`LAMA_TORCHSCRIPT_PATH` + `LAMA_SHA256`) | big-lama TorchScript export |
| `flux1-schnell` | `/v1/image-generation` | diffusers `FluxPipeline` | `black-forest-labs/FLUX.1-schnell` |
| `qwen-image` | `/v1/image-generation` | diffusers `DiffusionPipeline` | `Qwen/Qwen-Image` |
| `wan2.1-i2v-14b-480p` | `/v1/i2v` | diffusers `WanImageToVideoPipeline` | `Wan-AI/Wan2.1-I2V-14B-480P-Diffusers` |

Not served: `sam2.1-hiera-large` (needs point/box prompts the pipeline does
not produce yet), `real-esrgan-x4plus` (no upscale stage), and every
non-commercial model. `flux1-dev`, `depth-anything-v2-large` and `rmbg-2.0`
make the server refuse to start if they appear in `INFERENCE_MODELS`.

Licences are decided in the backend's model registry (`AiModel`), not here.
The server's allowlist is a second line of defence. Only list models whose
licence you have verified for commercial news use.

## Security model

* **Never expose this port to the public internet.** Bind it to localhost,
  or to the private network that only your GPU/worker hosts share. The backend
  refuses to call a non-private host unless it uses HTTPS and has an API key
  (`localai/endpointPolicy.ts`).
* Every request needs `Authorization: Bearer $INFERENCE_API_KEY`, `/v1/health` included.
* Every job must also be signed:
  `X-Atma-Signature = hex(HMAC-SHA256(INFERENCE_SIGNING_SECRET, "{timestamp}.{jobId}.{sha256hex(body)}"))`.
  The timestamp must be within ±300 s, each signature is accepted once
  (replay cache), and the body's `jobId` must equal the signed header.
* Request bodies are capped (`INFERENCE_MAX_BODY_MB`, default 64). Inputs
  must be valid base64 images (≤ 40 MP).
* There are no interactive docs and no OpenAPI endpoint.
* Remote code: BiRefNet uses `trust_remote_code`, so it only loads at a
  pinned, reviewed `revision`. LaMa TorchScript only loads if its SHA-256
  matches `LAMA_SHA256`.
* Secrets come from the environment only. Generate them with
  `openssl rand -hex 24` (API key) and `openssl rand -hex 32` (signing secret).
  Set the same values as `INFERENCE_API_KEY` / `INFERENCE_SIGNING_SECRET`
  in the backend's environment.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `INFERENCE_API_KEY` | (required, ≥ 24 chars) | Bearer token |
| `INFERENCE_SIGNING_SECRET` | (required, ≥ 32 chars) | HMAC secret |
| `INFERENCE_MODELS` | empty | Comma list of backend `modelId`s to serve |
| `INFERENCE_MODEL_SOURCES` | — | JSON `{modelId: {"repo": "...", "revision": "<commit>"}}`; pin revisions here |
| `INFERENCE_SLOTS` | 1 | Jobs that may run on the GPU at once |
| `INFERENCE_MAX_WAITING` | 4 | Queued jobs beyond the slots before answering 429 (the backend retries) |
| `INFERENCE_MAX_BODY_MB` | 64 | Request size limit |
| `INFERENCE_MAX_SKEW_SECONDS` | 300 | Signature timestamp window |
| `INFERENCE_CPU_OFFLOAD` | false | `enable_model_cpu_offload()` for diffusers pipelines (fits smaller GPUs; slower) |
| `LAMA_TORCHSCRIPT_PATH`, `LAMA_SHA256` | — | big-lama TorchScript file and its reviewed checksum |
| `GPU_WORKER_ID` | — | Reported back as `gpuWorkerId` (match the backend GPU worker's id) |
| `HF_HOME` | — | Model cache directory (mount a volume) |

## Run

```bash
cd inference-server
python -m venv .venv && . .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cu124   # match your CUDA
pip install -r requirements-gpu.txt
export INFERENCE_API_KEY=... INFERENCE_SIGNING_SECRET=... \
       INFERENCE_MODELS=depth-anything-v2-small,birefnet \
       INFERENCE_MODEL_SOURCES='{"birefnet":{"repo":"ZhengPeng7/BiRefNet","revision":"<reviewed-commit-sha>"}}'
uvicorn --factory app.main:app_factory --host 127.0.0.1 --port 8190 --workers 1
```

Use one uvicorn worker per GPU. Each worker loads its own copy of the
models, so run more processes only with one GPU each
(`CUDA_VISIBLE_DEVICES`).

Docker: `docker build -t atma-inference inference-server`, then run it with
`--gpus all`, the environment above, a volume on `/models`, and
`-p 127.0.0.1:8190:8190` (or a private-network address).

## Tests (CPU, no torch needed)

```bash
pip install -r requirements.txt
python -m pytest -q tests
```

The tests cover:

* the signature, checked against a vector produced by the Node client
* bearer auth
* tampering, stale timestamps, replays and job-id mismatch
* the model allowlist, input validation and size limits
* refusal of weak secrets and non-commercial models
* the image helpers

## Bring-up checklist (per model, on the GPU host)

1. Read the model card and licence again, and record the result in the
   admin **Model registry**. Keep `productionApproved` off until legal agrees.
2. Pin the weights: set `INFERENCE_MODEL_SOURCES` to the exact commit you
   reviewed.
3. Add the model to `INFERENCE_MODELS`, start the server, then check that
   `curl -H "Authorization: Bearer $KEY" http://127.0.0.1:8190/v1/health`
   lists it.
4. In the admin Model registry, set the model's endpoint to this server
   (or set `INFERENCE_BASE_URL` in the backend) and enable it.
5. Run one story in a staging environment.
   * In the Shot Inspector, check the asset's provenance: model, version,
     seed and duration.
   * Check the output quality: depth white = near, masks white = keep, and
     inpainting that leaves unmasked pixels untouched.
6. Only then make it the default for its task.
