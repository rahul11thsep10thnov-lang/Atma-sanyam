"""Builds the audio of a scene and of a whole story from speech clips, cues and music."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from ..asset_manager.library import AssetLibrary
from ..common.errors import EngineError
from ..schema.assets import AssetType
from ..schema.story import NARRATOR, Scene, Story
from .analysis import read_wav
from .mixer import AudioMixer, MixReport
from .speech import StorySpeech, line_key
from .timing import ShotTiming, scene_offsets


@dataclass
class SoundtrackResult:
    path: Path
    duration: float
    report: MixReport
    problems: list[dict] = field(default_factory=list)


def _add_scene(mixer: AudioMixer, story: Story, scene: Scene, speech: StorySpeech, timing: dict[str, ShotTiming],
               library: AssetLibrary, at: float, problems: list[dict]) -> None:
    offsets = scene_offsets(scene)
    scene_end = at + scene.total_duration
    for shot in scene.shots:
        t0 = at + offsets[shot.shot_id]
        for lt in timing[shot.shot_id].lines:
            clip = speech.clips.get(line_key(scene.scene_id, shot.shot_id, lt.line_id))
            if clip is None:
                problems.append({"line": line_key(scene.scene_id, shot.shot_id, lt.line_id), "message": "no audio for this line"})
                continue
            samples = read_wav(clip.path)
            if lt.speaker == NARRATOR:
                mixer.add_narration(samples, t0 + lt.start)
            else:
                mixer.add_dialogue(lt.speaker, samples, t0 + lt.start)
        for cue in shot.audio:
            asset_type = AssetType.music if cue.type == "music" else AssetType.sound_effect
            try:
                manifest = library.audio(asset_type, cue.asset_id)
                samples = read_wav(library.file_path(asset_type, cue.asset_id, manifest.file))
            except EngineError as exc:
                problems.append({"cue": cue.cue_id, "message": exc.message})
                continue
            start = t0 + cue.start_seconds
            end = start + cue.duration_seconds if cue.duration_seconds else (scene_end if cue.loop else None)
            if end is not None and not cue.loop:
                samples = samples[: int((end - start) * mixer.rate)]
            gain = cue.volume * (0.5 if cue.type == "ambience" else 0.8)
            if cue.type == "music":
                mixer.add_music(samples, start, gain, loop_until=end if cue.loop else None)
            else:
                mixer.add_effect(cue.cue_id, samples, start, gain, loop_until=end if cue.loop else None)


def build_scene_audio(story: Story, scene_id: str, speech: StorySpeech, library: AssetLibrary, out: Path,
                      timing: dict[str, ShotTiming] | None = None, with_music: bool = False) -> SoundtrackResult:
    """Speech, effects and ambience of one scene (music optional: the final mix lays one track under the whole story)."""
    scene = story.scene(scene_id)
    timing = timing or speech.scene_timing(story, scene_id)
    mixer = AudioMixer()
    problems: list[dict] = []
    _add_scene(mixer, story, scene, speech, timing, library, 0.0, problems)
    if with_music:
        _add_music(mixer, story, library, scene.total_duration, problems)
    path, report = mixer.export(out, scene.total_duration, fade_out=min(0.3, scene.transition_out.duration_seconds))
    return SoundtrackResult(path, scene.total_duration, report, problems)


def _add_music(mixer: AudioMixer, story: Story, library: AssetLibrary, duration: float, problems: list[dict]) -> None:
    music = story.audio.music
    if music is None:
        return
    try:
        manifest = library.audio(AssetType.music, music.track_id)
        samples = read_wav(library.file_path(AssetType.music, music.track_id, manifest.file))
    except EngineError as exc:
        problems.append({"cue": "music", "message": exc.message})
        return
    mixer.add_music(samples, 0.0, 0.35 * music.volume / 0.5, loop_until=duration)


def build_story_audio(story: Story, speech: StorySpeech, library: AssetLibrary, out: Path,
                      scene_ids: list[str] | None = None) -> SoundtrackResult:
    """The final soundtrack: every scene in order with one music bed that ducks under speech."""
    mixer = AudioMixer()
    problems: list[dict] = []
    at = 0.0
    for scene in story.scenes:
        if scene_ids is not None and scene.scene_id not in scene_ids:
            continue
        _add_scene(mixer, story, scene, speech, speech.scene_timing(story, scene.scene_id), library, at, problems)
        at += scene.total_duration
    _add_music(mixer, story, library, at, problems)
    duck = story.audio.music.duck_under_speech if story.audio.music else True
    path, report = mixer.export(out, at, duck=duck, fade_out=1.0)
    return SoundtrackResult(path, at, report, problems)
