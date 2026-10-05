# ComfyUI workflow templates

API-format ComfyUI workflows used by `src/studio/localai/comfyui/adapters.ts`.
`{{name}}` placeholders are filled from the model registry `config` plus the
request (prompt, seed, size…); a template with an unfilled placeholder is never
sent. The `_meta_template` key is documentation and is stripped before queueing.

| File | Model (registry id) | Licence (as recorded in the registry) | Custom nodes |
|---|---|---|---|
| `flux-schnell-txt2img.json` | `flux1-schnell` | Apache-2.0 | none |
| `sdxl-txt2img.json` | `sdxl-base-1.0` | CreativeML Open RAIL++-M (not production-approved by default) | none |
| `depth-anything-v2-small.json` | `depth-anything-v2-small` (switch provider to `comfyui`) | Apache-2.0 (Small only) | comfyui_controlnet_aux |
| `wan21-i2v-480p.json` | `wan2.1-i2v-14b-480p` | Apache-2.0 | none (native Wan nodes) |

**Status:** these templates follow the node signatures of current ComfyUI
releases, but they were **not executed** in this repository's CI (no GPU is
available there). Validate each one on your ComfyUI version before enabling the
model in the registry (Admin → Studio → Models), and re-check licences before
every deployment.

Security: ComfyUI has no authentication of its own. Run it on the internal
network only (docker network / VPC), or behind a reverse proxy that enforces a
bearer token (`COMFYUI_API_KEY`). The backend refuses public, non-HTTPS or
key-less ComfyUI URLs.
