"""Narration and dialogue: text -> cached, validated, normalised speech clips with timing."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from ..asset_manager.library import AssetLibrary
from ..common.errors import AudioError
from ..schema.story import NARRATOR, DialogueLine, Shot, Story
from .analysis import AudioStats, analyse, envelope, normalise_rms, read_wav, trim_silence, write_wav
from .providers import VoiceProvider
from .timing import LineTiming, ShotTiming, layout_shot
from .voices import VoiceIdentity, VoiceRegistry

CACHE_VERSION = 2


@dataclass
class SpeechClip:
    key: str
    path: Path
    duration: float
    voice_id: str
    text: str
    cached: bool
    stats: AudioStats


def line_key(scene_id: str, shot_id: str, line_id: str) -> str:
    return f"{scene_id}/{shot_id}/{line_id}"


class AudioCache:
    """Content-addressed store: the same text in the same voice from the same provider is generated once."""

    def __init__(self, directory: Path) -> None:
        self.directory = Path(directory)

    @staticmethod
    def key(provider: VoiceProvider, voice: VoiceIdentity, text: str) -> str:
        payload = {"v": CACHE_VERSION, "voice": voice.id, "language": voice.language, "text": text,
                   **provider.cache_fingerprint(voice)}
        return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()

    def path(self, key: str) -> Path:
        return self.directory / key[:2] / f"{key}.wav"

    def get(self, key: str) -> Path | None:
        p = self.path(key)
        return p if p.is_file() and p.stat().st_size > 100 else None

    def put(self, key: str, source: Path, meta: dict) -> Path:
        p = self.path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, p)
        p.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
        return p


def validate_audio(path: Path, expect_speech: bool = True) -> list[str]:
    """Problems that make a clip unusable or suspicious."""
    stats = analyse(read_wav(path))
    problems = []
    if stats.duration < 0.08:
        problems.append("audio is shorter than 0.08 s")
    if stats.silent:
        problems.append("audio is silent")
    if stats.clipped_runs:
        problems.append(f"audio is clipped ({stats.clipped_runs} runs at full scale)")
    if expect_speech and not stats.silent and stats.rms_db < -45:
        problems.append(f"audio is very quiet ({stats.rms_db:.1f} dBFS)")
    return problems


class NarrationService:
    """Generates speech through a provider, once per distinct (voice, text)."""

    def __init__(self, provider: VoiceProvider, voices: VoiceRegistry, cache: AudioCache) -> None:
        self.provider, self.voices, self.cache = provider, voices, cache
        self.generated = 0
        self.reused = 0

    @staticmethod
    def split_into_segments(text: str, max_chars: int = 220) -> list[str]:
        """Sentence-sized pieces (a provider may limit input length); never splits inside a sentence unless it must."""
        sentences = [s.strip() for s in re.findall(r"[^।?!.]+[।?!.]*", text) if s.strip()]
        out: list[str] = []
        for s in sentences or [text.strip()]:
            if out and len(out[-1]) + len(s) + 1 <= max_chars:
                out[-1] = f"{out[-1]} {s}"
            else:
                out.append(s)
        return out

    def generate_narration(self, text: str, voice_id: str, key: str = "", force: bool = False) -> SpeechClip:
        voice = self.voices.get(voice_id)
        spoken = self.voices.correct(text.strip(), voice.language)
        if not spoken:
            raise AudioError("Cannot synthesise empty text")
        ckey = self.cache.key(self.provider, voice, spoken)
        path = None if force else self.cache.get(ckey)
        cached = path is not None
        if path is None:
            path = self.cache_audio(ckey, spoken, voice)
            self.generated += 1
        else:
            self.reused += 1
        samples = read_wav(path)
        return SpeechClip(key, path, round(len(samples) / 44100, 4), voice_id, text, cached, analyse(samples))

    def cache_audio(self, ckey: str, spoken: str, voice: VoiceIdentity) -> Path:
        """Synthesise every segment, join, clean up (trim, loudness), validate, store."""
        import numpy as np
        work = self.cache.directory / "_work"
        work.mkdir(parents=True, exist_ok=True)
        parts = []
        try:
            for i, segment in enumerate(self.split_into_segments(spoken)):
                raw = work / f"{ckey[:16]}_{i}.wav"
                self.provider.generate_voice(segment, voice, raw)
                parts.append(trim_silence(read_wav(raw)))
                parts.append(np.zeros(int(0.12 * 44100), dtype=np.float32))
                raw.unlink(missing_ok=True)
            samples = normalise_rms(np.concatenate(parts[:-1]) if len(parts) > 1 else parts[0])
            final = write_wav(work / f"{ckey[:16]}.wav", samples)
            problems = validate_audio(final)
            if problems:
                raise AudioError(f"Generated audio failed validation: {'; '.join(problems)}", details={"text": spoken[:80]})
            stored = self.cache.put(ckey, final, {"voice": voice.id, "provider": self.provider.name, "text": spoken})
            final.unlink(missing_ok=True)
            return stored
        finally:
            for leftover in work.glob(f"{ckey[:16]}*"):
                leftover.unlink(missing_ok=True)

    def validate_audio(self, path: Path) -> list[str]:
        return validate_audio(path)


class DialogueService:
    """Chooses each line's voice and works out when lines play."""

    def __init__(self, narration: NarrationService, library: AssetLibrary | None = None) -> None:
        self.narration = narration
        self.library = library

    def assign_speaker(self, line: DialogueLine, story: Story) -> str:
        """Voice id for a line: explicit on the line, then on the story's character, then the character's own default."""
        if line.voice_id:
            return line.voice_id
        if line.speaker == NARRATOR:
            return story.audio.narrator_voice
        ref = next((c for c in story.characters if c.character_id == line.speaker), None)
        if ref and ref.voice_id:
            return ref.voice_id
        if self.library is not None and ref is not None:
            try:
                default = self.library.character(ref.character_id, ref.asset_version).default_voice
            except Exception:
                default = None
            if default:
                return default
        raise AudioError(f"No voice is assigned to '{line.speaker}'", details={"speaker": line.speaker})

    def generate_dialogue(self, line: DialogueLine, story: Story, key: str, force: bool = False) -> SpeechClip:
        return self.narration.generate_narration(line.text, self.assign_speaker(line, story), key, force)

    @staticmethod
    def calculate_timing(shot: Shot, clips: dict[str, SpeechClip], scene_id: str, fps: int) -> ShotTiming:
        """Lay the shot's lines out with their real durations and attach loudness envelopes for lip-sync."""
        durations = {l.line_id: clips[line_key(scene_id, shot.shot_id, l.line_id)].duration for l in shot.dialogue
                     if line_key(scene_id, shot.shot_id, l.line_id) in clips}
        timing = layout_shot(shot, durations)
        for lt in timing.lines:
            clip = clips.get(line_key(scene_id, shot.shot_id, lt.line_id))
            if clip is not None:
                lt.envelope = envelope(read_wav(clip.path), fps)
                lt.audio_path = str(clip.path)
        return timing


@dataclass
class StorySpeech:
    clips: dict[str, SpeechClip] = field(default_factory=dict)
    generated: int = 0
    reused: int = 0
    problems: list[dict] = field(default_factory=list)

    def durations(self) -> dict[str, float]:
        """line id -> seconds (line ids are unique per shot; the last component of the key)."""
        return {k.rsplit("/", 1)[1]: c.duration for k, c in self.clips.items()}

    def scene_timing(self, story: Story, scene_id: str) -> dict[str, ShotTiming]:
        scene = story.scene(scene_id)
        return {shot.shot_id: DialogueService.calculate_timing(shot, self.clips, scene_id, story.output.fps) for shot in scene.shots}


def produce_speech(story: Story, dialogue: DialogueService, scene_ids: list[str] | None = None, force: bool = False,
                   progress=None) -> StorySpeech:
    """Generate (or reuse) the audio of every line of the story."""
    out = StorySpeech()
    narration = dialogue.narration
    before = (narration.generated, narration.reused)
    lines = [(sc.scene_id, sh.shot_id, l) for sc in story.scenes if scene_ids is None or sc.scene_id in scene_ids
             for sh in sc.shots for l in sh.dialogue]
    for i, (scene_id, shot_id, line) in enumerate(lines):
        key = line_key(scene_id, shot_id, line.line_id)
        try:
            out.clips[key] = dialogue.generate_dialogue(line, story, key, force)
        except AudioError as exc:
            out.problems.append({"line": key, "message": exc.message})
        if progress:
            progress((i + 1) / max(1, len(lines)))
    out.generated, out.reused = narration.generated - before[0], narration.reused - before[1]
    return out
