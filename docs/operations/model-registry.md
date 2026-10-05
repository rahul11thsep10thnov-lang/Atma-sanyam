# Operating the model registry

Every model that can produce an asset is a row in `AiModel` (admin:
**Production → Models**). The registry answers two questions for every
generation: *which model?* and *may its output be published?*

## The licence gate

`licenseVerdict()` (`backend/src/studio/models/modelRegistry.ts`):

| Verdict | When | Production use |
|---|---|---|
| `CLEARED` | `commercialUseAllowed` **and** `productionApproved` | allowed |
| `OVERRIDDEN` | otherwise, but a super admin recorded an override with a reason | allowed, audited |
| `BLOCKED_NON_COMMERCIAL` | `commercialUseAllowed = false` (or not verified) | blocked |
| `BLOCKED_NOT_APPROVED` | commercial use allowed but no production approval (e.g. pending legal review of use restrictions) | blocked |

The gate is enforced in four places:

* **Model resolution.** Production jobs skip blocked models. A shot pinned
  to a blocked model fails with `LICENSE_BLOCKED`.
* **Asset reuse.** An asset whose generating model is no longer cleared is
  not reused. This includes editor uploads marked without commercial rights.
* **Shot QC** reports a BLOCKING `licence` issue.
* **The publish gate** blocks any story with a layer from an uncleared model.

Previews (Shot Inspector) may use any enabled model. Their output is never
publishable.

Nothing is inferred from a model being "open source" or "open weight".
Unknown means blocked.

## Seeded models (`models/defaultModels.ts`)

Licence facts were checked on 2026-10-05 against the publishers'
repositories. Hugging Face model cards were not reachable from the build
environment, so **re-verify every model card before enabling it.**

| modelId | Task | Provider | Licence (as recorded) | Commercial | Production approved |
|---|---|---|---|---|---|
| atma-procedural-v1 / atma-alpha-matte-v1 / atma-layer-depth-v1 / atma-diffusion-fill-v1 | all | procedural | this codebase | yes | yes (output = placeholder until an editor approves it) |
| flux1-schnell | image | comfyui | Apache-2.0 | yes | yes |
| qwen-image | image | http-inference | Apache-2.0 | yes | yes |
| sdxl-base-1.0 | image | comfyui | CreativeML Open RAIL++-M | yes | **no** (use-based restrictions: legal sign-off first) |
| flux1-dev | image | comfyui | FLUX.1-dev Non-Commercial | **no** | no |
| birefnet | segmentation | http-inference | MIT | yes | yes |
| sam2.1-hiera-large | segmentation | http-inference | Apache-2.0 | yes | yes (not served by the reference server) |
| rmbg-2.0 | segmentation | http-inference | CC BY-NC 4.0 (unverified) | **no** | no |
| depth-anything-v2-small | depth | http-inference (ComfyUI workflow available) | Apache-2.0 | yes | yes |
| depth-anything-v2-large | depth | http-inference | CC-BY-NC-4.0 | **no** | no |
| midas-dpt-hybrid | depth | http-inference | MIT | yes | yes |
| big-lama | inpainting | http-inference | Apache-2.0 | yes | yes |
| real-esrgan-x4plus | upscale | http-inference | BSD-3-Clause | yes | yes (no upscale stage yet) |
| wan2.1-i2v-14b-480p | i2v | comfyui | Apache-2.0 (+ content restrictions) | yes | yes |

Every third-party model is seeded **disabled**. The procedural models are
enabled defaults, so the platform works offline.

Re-running `npm run prisma:seed`:

* refreshes technical and licence facts;
* keeps administrator decisions (enabled, default, endpoint, overrides);
* always revokes approval when the licence now says non-commercial.

## Day-to-day tasks

**Enable a model** (admin, after its GPU service is up — see `gpu-deployment.md`):

1. Read the model card and licence again, check the version you deploy, and
   update `licenseNotes` in `defaultModels.ts` if anything changed.
2. Models → set the endpoint if it differs from `COMFYUI_BASE_URL` /
   `INFERENCE_BASE_URL` → **Enable**.
3. Run a staging story. In the Shot Inspector, check each asset's
   provenance and licence verdict.
4. **Make default** for its task once the quality is acceptable.

**Approve a model that is pending legal review** (super admin): use
**Override**.

* Give a written reason of at least 10 characters, e.g. the legal ticket.
* Overrides record who approved and why, and they are audit-logged.
* Revoke an override the same way.

**Stop using a model now:** **Disable** it.

* New jobs resolve to the next-ranked model, or to procedural.
* Existing assets keep their provenance, and remain publishable only if
  their model is still cleared.

**Model licence changed to non-commercial:**

1. Set `commercialUseAllowed: false` in `defaultModels.ts` and re-seed (or
   disable the model at once).
2. Find affected assets in the Asset library (filter by story or role, and
   check provenance).
3. Regenerate them with a cleared model. The publish gate already blocks
   any story still using them.

## Attribution

Models with `attributionRequired` carry an `attributionText`. Keep the
attributions current on the app's credits or about page for every model
used in production.
