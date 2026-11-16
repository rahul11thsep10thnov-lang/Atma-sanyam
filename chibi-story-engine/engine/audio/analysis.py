"""Reading, measuring and writing audio (mono float arrays). numpy only."""
from __future__ import annotations

import math
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from ..common.errors import AudioError

SAMPLE_RATE = 44100
CLIP_LEVEL = 0.999
SILENCE_DB = -50.0


def read_wav(path: Path, target_rate: int = SAMPLE_RATE) -> np.ndarray:
    """Load a PCM WAV as mono float32 in [-1, 1], resampled to `target_rate`."""
    try:
        with wave.open(str(path), "rb") as w:
            channels, width, rate, frames = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
            raw = w.readframes(frames)
    except (wave.Error, EOFError, FileNotFoundError) as exc:
        raise AudioError(f"'{Path(path).name}' is not a readable WAV file: {exc}") from exc
    if width == 2:
        data = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    elif width == 1:
        data = (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif width == 4:
        data = np.frombuffer(raw, dtype="<i4").astype(np.float32) / 2147483648.0
    else:
        raise AudioError(f"'{Path(path).name}' uses an unsupported sample width ({width} bytes)")
    if channels > 1:
        data = data[: len(data) // channels * channels].reshape(-1, channels).mean(axis=1)
    return resample(data, rate, target_rate)


def resample(samples: np.ndarray, rate: int, target: int) -> np.ndarray:
    if rate == target or len(samples) == 0:
        return samples.astype(np.float32)
    n = int(round(len(samples) * target / rate))
    return np.interp(np.linspace(0, len(samples) - 1, n), np.arange(len(samples)), samples).astype(np.float32)


def write_wav(path: Path, samples: np.ndarray, rate: int = SAMPLE_RATE) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (np.clip(samples, -1.0, 1.0) * 32767.0).astype("<i2")
    tmp = path.with_suffix(".tmp.wav")
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(data.tobytes())
    tmp.replace(path)
    return path


def db(value: float) -> float:
    return 20.0 * math.log10(value) if value > 1e-9 else -120.0


@dataclass
class AudioStats:
    duration: float
    peak_db: float
    rms_db: float
    clipped_samples: int
    clipped_runs: int
    leading_silence: float
    trailing_silence: float
    silent: bool

    def to_dict(self) -> dict:
        return {k: (round(v, 3) if isinstance(v, float) else v) for k, v in self.__dict__.items()}


def analyse(samples: np.ndarray, rate: int = SAMPLE_RATE) -> AudioStats:
    n = len(samples)
    if n == 0:
        return AudioStats(0.0, -120.0, -120.0, 0, 0, 0.0, 0.0, True)
    mag = np.abs(samples)
    peak = float(mag.max())
    rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
    hot = mag >= CLIP_LEVEL
    # a clipped run is 3 or more consecutive samples pinned at full scale
    edges = np.diff(np.concatenate(([0], hot.astype(np.int8), [0])))
    starts, ends = np.nonzero(edges == 1)[0], np.nonzero(edges == -1)[0]
    runs = int(np.sum((ends - starts) >= 3))
    loud = np.nonzero(mag > 10 ** (SILENCE_DB / 20))[0]
    silent = len(loud) == 0
    lead = 0.0 if silent else loud[0] / rate
    trail = 0.0 if silent else (n - 1 - loud[-1]) / rate
    return AudioStats(n / rate, db(peak), db(rms), int(hot.sum()), runs, float(lead), float(trail), silent)


def analyse_file(path: Path) -> AudioStats:
    return analyse(read_wav(path))


def trim_silence(samples: np.ndarray, rate: int = SAMPLE_RATE, keep: float = 0.04) -> np.ndarray:
    loud = np.nonzero(np.abs(samples) > 10 ** (SILENCE_DB / 20))[0]
    if len(loud) == 0:
        return samples
    pad = int(keep * rate)
    return samples[max(0, loud[0] - pad): min(len(samples), loud[-1] + pad)]


def normalise_rms(samples: np.ndarray, target_db: float = -20.0, max_peak: float = 0.95) -> np.ndarray:
    """Bring speech to a common loudness without letting peaks clip."""
    rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2))) if len(samples) else 0.0
    if rms < 1e-6:
        return samples
    gain = 10 ** (target_db / 20) / rms
    peak = float(np.abs(samples).max()) * gain
    if peak > max_peak:
        gain *= max_peak / peak
    return (samples * gain).astype(np.float32)


def envelope(samples: np.ndarray, fps: int, rate: int = SAMPLE_RATE) -> list[float]:
    """Loudness per video frame, 0..1: what drives mouths."""
    hop = rate / fps
    n = max(1, int(math.ceil(len(samples) / hop)))
    values = np.zeros(n)
    for i in range(n):
        chunk = samples[int(i * hop): int((i + 1) * hop)]
        if len(chunk):
            values[i] = math.sqrt(float(np.mean(chunk.astype(np.float64) ** 2)))
    ref = float(np.percentile(values, 92)) if n > 3 else float(values.max())
    if ref < 1e-5:
        return [0.0] * n
    shaped = np.clip(values / ref, 0.0, 1.0) ** 0.7
    shaped[values < ref * 0.06] = 0.0
    return [round(float(v), 4) for v in shaped]
