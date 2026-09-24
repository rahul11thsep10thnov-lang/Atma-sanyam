# Chatterbox Voice Setup (free, self-hosted alternative to ElevenLabs)

[Chatterbox](https://github.com/resemble-ai/chatterbox) is an MIT-licensed,
open-source text-to-speech model from Resemble AI. Unlike ElevenLabs, it is
not a paid API — you run the server yourself, so there is no per-character
or per-minute cost and no usage cap. This is the right choice if you're
generating a large volume of video and want to avoid metered voice
pricing (see `docs/ELEVENLABS.md` for the paid, zero-setup alternative).

The trade-off: someone has to run the server. It needs either a GPU for
best speed, or a decent multi-core CPU (the "Nano" model variant runs
faster than real-time on an 8-core CPU with no GPU at all).

## 1. Run the Chatterbox server

The easiest path is the community server at
[devnen/Chatterbox-TTS-Server](https://github.com/devnen/Chatterbox-TTS-Server),
which wraps the Chatterbox model in a small HTTP API this app talks to.

On a machine with Docker installed (your own PC, or a rented cloud VM):

```bash
git clone https://github.com/devnen/Chatterbox-TTS-Server.git
cd Chatterbox-TTS-Server

# Pick ONE, matching your hardware:
docker compose up -d --build                              # NVIDIA GPU (CUDA 12.1)
docker compose -f docker-compose-cu128.yml up -d --build   # newer NVIDIA (Blackwell)
docker compose -f docker-compose-rocm.yml up -d --build    # AMD GPU
docker compose -f docker-compose-cpu.yml up -d --build     # no GPU at all
```

The server listens on `http://localhost:8004` by default, with a web UI at
that same address you can use to sanity-check it independently of this app.

**Don't have a machine that can run this comfortably?** Rent a small cloud
GPU box by the hour (several providers offer this for well under a dollar
an hour) for as long as you're generating a batch of videos, then shut it
down — you only pay for the hours it's running, not per character
generated.

## 2. Configure the app

Edit `.env`:

```
MOCK_VOICE=false
VOICE_PROVIDER=chatterbox
CHATTERBOX_API_URL=http://localhost:8004
```

If the Chatterbox server runs on a different machine than the backend,
replace `localhost` with that machine's address (and make sure it's
reachable — e.g. over your local network or a VPN, not the open internet
unless you've secured it).

Restart the backend after changing `.env`.

## 3. Clone your voice

From the dashboard, go to **Voices** and use **Clone your voice**: upload a
short (5-30 second), clean, single-speaker audio clip of the voice you
want. The app uploads it to your Chatterbox server once and stores the
resulting filename as your account's one configured voice — every video
from then on uses that same voice, exactly like the ElevenLabs flow (build
spec section 4: one consistent voice, no per-video re-cloning, no random
switching).

You can re-clone at any time by uploading a new clip; it replaces the
stored voice for all future generations without affecting already-rendered
videos.

## 4. Test it

Use **Test Voice** on the same page — it calls your Chatterbox server the
same way generating a real lesson would.

## Notes

- **Quality/voice-mode knobs**: `CHATTERBOX_EXAGGERATION`,
  `CHATTERBOX_CFG_WEIGHT`, and `CHATTERBOX_TEMPERATURE` in `.env` control
  expressiveness and stability of the generated voice. The server's own
  defaults (0.5 / 0.5 / 0.8) are a reasonable starting point; the
  Chatterbox project's own documentation covers tuning them further.
- **Language**: set `CHATTERBOX_LANGUAGE` (or per-lesson language) to one
  of Chatterbox's 23+ supported languages, including Hindi.
- **This app never bundles or redistributes the Chatterbox model** — you
  run the official open-source project yourself. `ChatterboxVoiceService`
  (`backend/app/services/voice/chatterbox_service.py`) only calls its HTTP
  API, mirroring how `ElevenLabsVoiceService` is the sole caller of
  ElevenLabs' API (build spec section 3).
- **Privacy**: because the server is yours, narration text never leaves
  infrastructure you control — a stronger privacy position than any hosted
  API. See `docs/PRIVACY.md`.
