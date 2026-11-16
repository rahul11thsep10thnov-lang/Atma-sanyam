"""Synthesised music and sound effects (numpy only), so the library needs no downloaded audio.

Everything is seeded and deterministic. Output: 44.1 kHz, 16-bit mono WAV.
"""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SR = 44100


def _t(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def _env(n: int, attack: float, release: float) -> np.ndarray:
    e = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def _lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):          # one-pole filter; fine for a few seconds of audio
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def _fft_band(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    spec[(freqs < lo) | (freqs > hi)] = 0
    return np.fft.irfft(spec, len(x))


def _norm(x: np.ndarray, peak: float = 0.8) -> np.ndarray:
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def write_wav(path: Path, samples: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (np.clip(samples, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def _pluck(freq: float, seconds: float, bright: float = 0.5) -> np.ndarray:
    t = _t(seconds)
    tone = np.sin(2 * np.pi * freq * t) + bright * 0.5 * np.sin(4 * np.pi * freq * t) + bright * 0.25 * np.sin(6 * np.pi * freq * t)
    return tone * np.exp(-t * 3.2) * _env(len(t), 0.004, 0.05)


def gentle_story_music(seconds: float = 32.0, seed: int = 7) -> np.ndarray:
    """A calm loop in a major pentatonic (raga Bhupali) over a tanpura-like drone."""
    rng = np.random.default_rng(seed)
    sa = 220.0
    scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2]
    out = np.zeros(int(seconds * SR))
    t = _t(seconds)
    drone = 0.16 * np.sin(2 * np.pi * sa / 2 * t) + 0.12 * np.sin(2 * np.pi * sa * 0.75 * t) + 0.08 * np.sin(2 * np.pi * sa * t)
    out += drone * (0.8 + 0.2 * np.sin(2 * np.pi * t / 8))
    beat = 0.5
    phrase = [0, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 3, 2, 3, 0]
    step, i = 0, 0
    while step * beat < seconds - 1.5:
        if rng.random() < 0.82:
            degree = phrase[i % len(phrase)] + (rng.integers(-1, 2) if rng.random() < 0.3 else 0)
            degree = int(np.clip(degree, 0, len(scale) - 1))
            note = _pluck(sa * scale[degree], 1.4) * 0.5
            start = int(step * beat * SR)
            out[start:start + len(note)] += note[: len(out) - start]
        if step % 4 == 0:                                   # soft low pulse on the bar
            thump = np.sin(2 * np.pi * 82 * _t(0.25)) * np.exp(-_t(0.25) * 18) * 0.35
            start = int(step * beat * SR)
            out[start:start + len(thump)] += thump[: len(out) - start]
        step += 1
        i += 1
    fade = int(0.6 * SR)                                    # loopable: cross-fade the tail into the head
    out[:fade] = out[:fade] * np.linspace(0, 1, fade) + out[-fade:] * np.linspace(1, 0, fade)
    return _norm(out[:-fade], 0.7)


def playful_music(seconds: float = 24.0, seed: int = 11) -> np.ndarray:
    rng = np.random.default_rng(seed)
    sa = 261.63
    scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2]
    out = np.zeros(int(seconds * SR))
    beat = 0.3
    for step in range(int((seconds - 1) / beat)):
        degree = int(rng.integers(0, len(scale))) if step % 2 else [0, 3, 2, 4][(step // 2) % 4]
        note = _pluck(sa * scale[degree], 0.6, bright=0.9) * (0.5 if step % 2 else 0.7)
        start = int(step * beat * SR)
        out[start:start + len(note)] += note[: len(out) - start]
    fade = int(0.4 * SR)
    out[:fade] = out[:fade] * np.linspace(0, 1, fade) + out[-fade:] * np.linspace(1, 0, fade)
    return _norm(out[:-fade], 0.65)


def river_ambience(seconds: float = 12.0, seed: int = 3) -> np.ndarray:
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(int(seconds * SR))
    water = _fft_band(noise, 300, 3200)
    t = _t(seconds)
    water *= 0.6 + 0.25 * np.sin(2 * np.pi * t / 3.1) + 0.15 * np.sin(2 * np.pi * t / 1.3 + 1.0)
    out = _norm(water, 0.35)
    for _ in range(9):                                      # a few bird chirps
        start = rng.uniform(0.5, seconds - 1.0)
        f0 = rng.uniform(2400, 3800)
        tt = _t(0.12)
        chirp = np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * 9 * tt)) * tt) * _env(len(tt), 0.01, 0.05) * 0.12
        for k in range(int(rng.integers(1, 4))):
            s = int((start + k * 0.17) * SR)
            out[s:s + len(chirp)] += chirp[: len(out) - s]
    fade = int(0.5 * SR)
    out[:fade] = out[:fade] * np.linspace(0, 1, fade) + out[-fade:] * np.linspace(1, 0, fade)
    return out[:-fade]


def forest_ambience(seconds: float = 12.0, seed: int = 5) -> np.ndarray:
    rng = np.random.default_rng(seed)
    wind = _fft_band(rng.standard_normal(int(seconds * SR)), 120, 900)
    t = _t(seconds)
    out = _norm(wind * (0.6 + 0.4 * np.sin(2 * np.pi * t / 5.0)), 0.22)
    for _ in range(16):
        start = rng.uniform(0.3, seconds - 1.0)
        f0 = rng.uniform(2000, 4200)
        tt = _t(0.1)
        chirp = np.sin(2 * np.pi * (f0 + 700 * np.sin(2 * np.pi * 11 * tt)) * tt) * _env(len(tt), 0.01, 0.04) * 0.14
        for k in range(int(rng.integers(1, 5))):
            s = int((start + k * 0.14) * SR)
            out[s:s + len(chirp)] += chirp[: len(out) - s]
    fade = int(0.5 * SR)
    out[:fade] = out[:fade] * np.linspace(0, 1, fade) + out[-fade:] * np.linspace(1, 0, fade)
    return out[:-fade]


def splash(seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = _t(0.9)
    noise = _fft_band(rng.standard_normal(len(t)), 400, 6000)
    body = noise * np.exp(-t * 6) * _env(len(t), 0.005, 0.2)
    plop = np.sin(2 * np.pi * (180 - 90 * t) * t) * np.exp(-t * 14) * 0.8
    return _norm(body + plop, 0.8)


def boing() -> np.ndarray:
    t = _t(0.45)
    f = 220 + 520 * t / 0.45
    return _norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4) * (1 + 0.3 * np.sin(2 * np.pi * 28 * t)), 0.6)


def munch(seed: int = 2) -> np.ndarray:
    rng = np.random.default_rng(seed)
    out = np.zeros(int(1.3 * SR))
    for k in range(4):
        tt = _t(0.09)
        crunch = _fft_band(rng.standard_normal(len(tt)), 900, 5000) * _env(len(tt), 0.004, 0.05)
        s = int((0.05 + k * 0.3) * SR)
        out[s:s + len(crunch)] += crunch
    return _norm(out, 0.55)


def whoosh(seed: int = 4) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = _t(0.5)
    noise = _fft_band(rng.standard_normal(len(t)), 500, 4000)
    return _norm(noise * np.sin(np.pi * t / 0.5) ** 2, 0.5)


def swim(seed: int = 6) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = _t(3.0)
    noise = _fft_band(rng.standard_normal(len(t)), 250, 2600)
    return _norm(noise * (0.35 + 0.65 * np.abs(np.sin(2 * np.pi * t / 1.0))) * _env(len(t), 0.3, 0.6), 0.5)


AUDIO = [
    # id, type, name, tags, generator, loopable
    ("gentle_story_001", "music", "Gentle story theme", ["story", "calm"], gentle_story_music, True),
    ("playful_001", "music", "Playful theme", ["playful"], playful_music, True),
    ("river_ambience_001", "sound_effect", "River with birds", ["ambience", "river", "river_mid", "pond"], river_ambience, True),
    ("forest_ambience_001", "sound_effect", "Forest wind and birds", ["ambience", "forest", "field", "village", "garden"], forest_ambience, True),
    ("splash_001", "sound_effect", "Water splash", ["splash"], splash, False),
    ("boing_001", "sound_effect", "Jump", ["jump"], boing, False),
    ("munch_001", "sound_effect", "Eating", ["eat"], munch, False),
    ("whoosh_001", "sound_effect", "Throw", ["throw"], whoosh, False),
    ("swim_001", "sound_effect", "Swimming", ["swim"], swim, False),
]


def build_audio(aid, atype, name, tags, generate, loopable, out: Path) -> dict:
    samples = generate()
    write_wav(out / "audio.wav", samples)
    return {"id": aid, "asset_type": atype, "name": name, "tags": tags, "file": "audio.wav", "description": name,
            "duration_seconds": round(len(samples) / SR, 4), "sample_rate": SR, "loopable": loopable}
