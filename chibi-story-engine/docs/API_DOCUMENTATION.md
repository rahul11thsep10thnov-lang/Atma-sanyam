# API

Base path `/api/v1`. Interactive reference (OpenAPI): `/api/docs`. Health: `GET /api/health`.

- **Authentication:** `POST /auth/login` with `{email, password}` returns `{access_token}`; send
  `Authorization: Bearer <token>`. Media URLs also accept `?access_token=` because `<img>`, `<audio>` and `<video>`
  cannot send headers.
- **Roles:** `admin` (everything), `producer` (create, edit, generate, render), `reviewer` (approve assets and scenes,
  publish), `viewer` (read).
- **Errors:** always `{"error": {"code", "message", "details"}}`; validation problems list `details.issues[{path, message}]`.
- **Files:** responses contain media URLs and ids, never filesystem paths.

| Method and path | Role | Purpose |
|---|---|---|
| `POST /auth/login`, `GET /auth/me` | any | sign in, who am I |
| `POST /auth/users` | admin | create a user |
| `POST /projects`, `GET /projects` | producer / any | projects |
| `POST /stories`, `GET /stories`, `GET /stories/{id}` | producer / any | stories; detail includes the current Story Definition and version list |
| `PATCH /stories/{id}` | producer | edit fields, or save a whole edited Story Definition (`story_json`) as a new version |
| `POST /stories/{id}/analyse` | producer | characters, scenes, dialogue, emotions, actions (`use_llm` optional) |
| `POST /stories/{id}/generate-storyboard` | producer | build the Story Definition; reports `missing_assets`; `character_overrides` recasts a character |
| `GET /stories/{id}/scenes` | any | storyboard view of each scene |
| `PATCH /scenes/{scene_id}` | producer / reviewer | edit fields or replace the scene; reviewers may only set `approval_status` |
| `POST /scenes/{scene_id}/regenerate` | producer | rebuild one scene from the analysis |
| `GET /scenes/{scene_id}/frame?t=&width=` | any | JPEG still (software compositor) |
| `POST /scenes/{scene_id}/preview` | producer | job: low-resolution scene render with sound |
| `POST /stories/{id}/generate-audio` | producer | narration and dialogue (cached); `retime` fits shots to the audio |
| `GET /stories/{id}/audio` | any | generated clips |
| `POST /stories/{id}/render` | producer | job: `mode` preview/final, optional `scene_ids`, `force` |
| `GET /render-jobs`, `GET /render-jobs/{id}` | any | status, progress, current scene, per-scene state, outputs |
| `POST /render-jobs/{id}/cancel`, `/resume` | producer | stop (finished scenes kept); run again (finished scenes reused) |
| `POST /stories/{id}/quality-check` | any | automatic checks and what awaits human approval |
| `GET /stories/{id}/exports` | any | finished videos with download URLs |
| `POST /stories/{id}/publish` | producer / reviewer | needs clean QC and all approvals; an admin may override approvals |
| `GET /assets?asset_type=&q=` | any | library search: exact id, then name, alias, tag |
| `POST /assets` (multipart) | producer | upload a prop image (PNG/JPEG) or a WAV; an existing id becomes a new version |
| `POST /assets/{type}/{id}/approval` | reviewer | approve or reject the current version |
| `GET /assets/{type}/{id}/verify` | any | checksum verification |
| `GET /characters`, `GET /characters/{code}`, `POST /characters` | any / producer | characters; create one from an existing rig |
| `GET /environments`, `GET /animations?rig=`, `GET /voices`, `GET /library/presets` | any | what the engine offers |
| `POST /library/sync` | producer | re-read the asset library from disk |
| `GET /media/outputs/{id}`, `/media/audio/{id}`, `/media/assets/{type}/{id}/{file}` | any | media delivery |

Render jobs move through `queued → running → completed | failed | cancelled`; `interrupted` marks a job that was
running when the server stopped. Uploads are limited to 25 MB, judged by content (not by name), re-encoded when
images, and stored only under the asset library.
