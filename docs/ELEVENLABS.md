# ElevenLabs Voice Setup

This app uses **one fixed Professional Voice Clone** for every generated
video so the "teacher" sounds like the same person across hundreds or
thousands of lessons. The app never creates or manages voice clones itself.

## 1. Create your voice clone in ElevenLabs

1. Sign in at https://elevenlabs.io.
2. Go to **Voices -> Add Voice -> Professional Voice Clone** (or Instant
   Voice Clone for testing).
3. Follow ElevenLabs' own upload/consent flow to create the clone.
4. Once created, open the voice and copy its **Voice ID** (visible in the
   voice's settings/API panel).

## 2. Get an API key

1. In ElevenLabs, go to **Profile -> API Keys**.
2. Create a key with text-to-speech permission.

## 3. Configure the application

Edit `.env` (never commit this file):

```
MOCK_VOICE=false
ELEVENLABS_API_KEY=sk_your_real_key
ELEVENLABS_VOICE_ID=your_voice_id
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_STABILITY=0.5
ELEVENLABS_SIMILARITY=0.75
ELEVENLABS_STYLE=0.0
ELEVENLABS_SPEED=1.0
```

Restart the backend after changing `.env`.

## 4. Test the voice

Open the dashboard's **Voices** page (`/voices`) and use **Test Voice**, or
call the API directly:

```
POST /api/voices/test
{ "text": "Hello, let's begin today's lesson." }
```

This calls `ElevenLabsVoiceService` server-side; the API key never reaches
the browser. The response includes an audio URL, duration, and the voice
settings used.

## 5. Generate a preview

From a lesson page, click **Generate Preview** to render a 20-30 second clip
using the real voice, real whiteboard renderer and real timing engine before
committing to a full render.

## Voice consistency rules enforced by the app

- `ELEVENLABS_VOICE_ID` is a single server-side configuration value. There is
  no UI control that lets a user submit an arbitrary voice ID from the
  browser and have it used directly — voice IDs are only ever set via `.env`
  or an authenticated settings write, never taken from request bodies on the
  generation endpoints (build spec section 36).
- The app never calls ElevenLabs' voice-cloning endpoints. It only ever calls
  text-to-speech with the configured voice ID.
- Voice settings (stability/similarity/style/speed/model) are stored once as
  a `VoiceProfile` row and reused; there is no per-scene random voice
  selection or switching.
- Small, explicit prosody adjustments are allowed only through the
  `VoiceProfile` configuration screen, never automatically per-scene.

## Mock mode

Set `MOCK_VOICE=true` (the default) to use `MockVoiceService`, which
generates a deterministic silent/tone placeholder WAV of a length estimated
from word count, with no network calls and no API key required. This lets
the entire pipeline (including Remotion rendering and quality control) be
exercised with zero paid API usage.

## Data privacy

The application stores only the `ELEVENLABS_VOICE_ID` string, never a copy of
the underlying voice model. See `docs/PRIVACY.md` for how disconnecting the
integration works and what is/isn't deleted on the ElevenLabs side (which
the app cannot control or guarantee, since it can only call ElevenLabs'
public API).
