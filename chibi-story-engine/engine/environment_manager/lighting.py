"""Lighting, time-of-day and weather presets. Cutout layers are unlit, so light is a colour grade per layer group."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Lighting:
    background: tuple[float, float, float]
    character: tuple[float, float, float]
    description: str = ""


LIGHTING_PRESETS: dict[str, Lighting] = {
    "day": Lighting((1.0, 1.0, 1.0), (1.0, 1.0, 1.0), "neutral daylight"),
    "morning": Lighting((1.0, 0.94, 0.84), (1.0, 0.97, 0.9), "warm, soft early light"),
    "sunset": Lighting((1.0, 0.72, 0.56), (1.0, 0.84, 0.74), "orange evening light"),
    "night": Lighting((0.34, 0.42, 0.72), (0.56, 0.62, 0.86), "blue moonlight"),
    "overcast": Lighting((0.8, 0.83, 0.87), (0.9, 0.92, 0.94), "flat grey light"),
}


@dataclass(frozen=True)
class Weather:
    wind: float = 1.0                       # multiplies wind-scaled layer motion
    effect: str | None = None               # effect type added to every shot
    grade: tuple[float, float, float] = (1.0, 1.0, 1.0)


WEATHER_PRESETS: dict[str, Weather] = {
    "clear": Weather(),
    "windy": Weather(wind=2.4),
    "rain": Weather(wind=1.6, effect="rain", grade=(0.82, 0.86, 0.92)),
}


def grade(time_of_day: str, weather: str) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    """(background tint, character tint) for a scene."""
    light = LIGHTING_PRESETS[time_of_day]
    w = WEATHER_PRESETS[weather].grade
    return (tuple(round(a * b, 4) for a, b in zip(light.background, w)),   # type: ignore[return-value]
            tuple(round(a * b, 4) for a, b in zip(light.character, w)))    # type: ignore[return-value]
