"""Audio mixer: narration, dialogue, effects and music on one timeline, with ducking and peak control."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from .analysis import SAMPLE_RATE, analyse, db, write_wav


@dataclass
class _Clip:
    samples: np.ndarray
    start: float
    gain: float


@dataclass
class MixReport:
    duration: float
    peak_db: float
    rms_db: float
    clipped_samples_before_limiting: int
    limiter_gain_db: float
    ducking_db: float
    tracks: dict[str, int] = field(default_factory=dict)
    clipped_runs: int = 0

    def to_dict(self) -> dict:
        return {k: (round(v, 3) if isinstance(v, float) else v) for k, v in self.__dict__.items()}


class AudioMixer:
    """Tracks: `narration_track`, `dialogue_tracks` (one per speaker), `effects_tracks`, `music_track`."""

    def __init__(self, sample_rate: int = SAMPLE_RATE) -> None:
        self.rate = sample_rate
        self.narration_track: list[_Clip] = []
        self.dialogue_tracks: dict[str, list[_Clip]] = {}
        self.effects_tracks: dict[str, list[_Clip]] = {}
        self.music_track: list[_Clip] = []

    # ------------------------------------------------------------- loading
    def add_narration(self, samples: np.ndarray, start: float, gain: float = 1.0) -> None:
        self.narration_track.append(_Clip(samples, start, gain))

    def add_dialogue(self, speaker: str, samples: np.ndarray, start: float, gain: float = 1.0) -> None:
        self.dialogue_tracks.setdefault(speaker, []).append(_Clip(samples, start, gain))

    def add_effect(self, name: str, samples: np.ndarray, start: float, gain: float = 1.0, loop_until: float | None = None) -> None:
        if loop_until is not None and len(samples):
            samples = self.loop(samples, loop_until - start)
        self.effects_tracks.setdefault(name, []).append(_Clip(samples, start, gain))

    def add_music(self, samples: np.ndarray, start: float = 0.0, gain: float = 1.0, loop_until: float | None = None) -> None:
        if loop_until is not None and len(samples):
            samples = self.loop(samples, loop_until - start)
        self.music_track.append(_Clip(samples, start, gain))

    def loop(self, samples: np.ndarray, seconds: float) -> np.ndarray:
        n = max(0, int(seconds * self.rate))
        reps = int(np.ceil(n / len(samples))) if len(samples) else 0
        return np.tile(samples, reps)[:n] if reps else np.zeros(0, dtype=np.float32)

    # -------------------------------------------------------------- mixing
    def _render(self, clips: list[_Clip], n: int) -> np.ndarray:
        out = np.zeros(n, dtype=np.float64)
        for clip in clips:
            start = int(round(clip.start * self.rate))
            if start >= n or start + len(clip.samples) <= 0:
                continue
            a, b = max(0, start), min(n, start + len(clip.samples))
            out[a:b] += clip.samples[a - start: b - start] * clip.gain
        return out

    def _follow(self, signal: np.ndarray, attack: float = 0.06, release: float = 0.45, block: float = 0.01) -> np.ndarray:
        """Smoothed loudness of `signal`, 0..1 (1 while speech is present)."""
        hop = max(1, int(block * self.rate))
        blocks = int(np.ceil(len(signal) / hop))
        padded = np.zeros(blocks * hop)
        padded[: len(signal)] = np.abs(signal)
        level = padded.reshape(blocks, hop).max(axis=1)
        present = (level > 0.02).astype(np.float64)
        env = np.zeros(blocks)
        a_up, a_down = 1 - np.exp(-block / attack), 1 - np.exp(-block / release)
        value = 0.0
        for i, target in enumerate(present):
            value += (a_up if target > value else a_down) * (target - value)
            env[i] = value
        return np.repeat(env, hop)[: len(signal)]

    def mix(self, duration: float, duck: bool = True, duck_depth_db: float = -11.0, fade_out: float = 0.0,
            ceiling: float = 0.94) -> tuple[np.ndarray, MixReport]:
        n = max(1, int(round(duration * self.rate)))
        speech = self._render(self.narration_track, n)
        for clips in self.dialogue_tracks.values():
            speech += self._render(clips, n)
        effects = np.zeros(n)
        for clips in self.effects_tracks.values():
            effects += self._render(clips, n)
        music = self._render(self.music_track, n)
        ducking = 0.0
        if duck and np.any(music) and np.any(speech):
            env = self._follow(speech)
            floor = 10 ** (duck_depth_db / 20)
            gain = 1.0 - (1.0 - floor) * env
            music *= gain
            effects *= 1.0 - (1.0 - 10 ** (duck_depth_db / 40)) * env      # effects dip half as far
            ducking = duck_depth_db if env.max() > 0.5 else 0.0
        total = speech + effects + music
        if fade_out > 0:
            k = min(n, int(fade_out * self.rate))
            total[-k:] *= np.linspace(1.0, 0.0, k)
        over = int(np.sum(np.abs(total) >= 0.999))
        peak = float(np.abs(total).max())
        limiter = 1.0
        if peak > ceiling:
            limiter = ceiling / peak
            total *= limiter
        samples = total.astype(np.float32)
        stats = analyse(samples, self.rate)
        report = MixReport(duration=n / self.rate, peak_db=stats.peak_db, rms_db=stats.rms_db, clipped_samples_before_limiting=over,
                           limiter_gain_db=db(limiter), ducking_db=ducking, clipped_runs=stats.clipped_runs,
                           tracks={"narration": len(self.narration_track), "dialogue": sum(len(c) for c in self.dialogue_tracks.values()),
                                   "effects": sum(len(c) for c in self.effects_tracks.values()), "music": len(self.music_track)})
        return samples, report

    def export(self, path: Path, duration: float, **kwargs) -> tuple[Path, MixReport]:
        samples, report = self.mix(duration, **kwargs)
        return write_wav(path, samples, self.rate), report
