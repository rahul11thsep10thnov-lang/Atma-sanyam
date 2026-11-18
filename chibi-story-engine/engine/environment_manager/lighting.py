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
    "noon": Lighting((1.04, 1.03, 0.98), (1.0, 1.0, 0.98), "bright, high sun"),
    "evening": Lighting((1.0, 0.84, 0.7), (1.0, 0.9, 0.82), "low golden light before sunset"),
    "moonlight": Lighting((0.46, 0.55, 0.8), (0.62, 0.7, 0.9), "cool, silver night with a bright moon"),
}


@dataclass(frozen=True)
class Weather:
    wind: float = 1.0                       # multiplies wind-scaled layer motion
    effect: str | None = None               # effect type added to every shot
    grade: tuple[float, float, float] = (1.0, 1.0, 1.0)
    extra: tuple[tuple[str, tuple[tuple[str, float], ...]], ...] = ()   # more (effect type, params) added to every shot
    foliage: tuple[float, float, float] = (1.0, 1.0, 1.0)             # extra tint on vegetation (snow-dusted, wet)


WEATHER_PRESETS: dict[str, Weather] = {
    "clear": Weather(),
    "windy": Weather(wind=2.4),
    "rain": Weather(wind=1.6, effect="rain", grade=(0.82, 0.86, 0.92)),
    "cloudy": Weather(wind=1.2, grade=(0.86, 0.88, 0.92)),
    "fog": Weather(wind=0.6, grade=(0.9, 0.92, 0.95), extra=(("fog", ()),)),
    "storm": Weather(wind=3.2, effect="rain", grade=(0.58, 0.62, 0.72), extra=(("rain", (("count", 120.0),)),), foliage=(0.9, 0.95, 0.95)),
    "snow": Weather(wind=1.0, effect="snow", grade=(0.92, 0.96, 1.04), foliage=(1.02, 1.05, 1.1)),
}


@dataclass(frozen=True)
class Season:
    foliage: tuple[float, float, float]     # tint of vegetation layers
    background: tuple[float, float, float]  # small shift of the whole scene
    description: str = ""


SEASON_PRESETS: dict[str, Season] = {
    "summer": Season((1.0, 1.0, 1.0), (1.0, 1.0, 1.0), "full green, strong light"),
    "spring": Season((1.05, 1.1, 0.95), (1.02, 1.02, 1.0), "fresh light green"),
    "monsoon": Season((0.78, 0.98, 0.84), (0.88, 0.92, 0.95), "deep saturated green, grey light"),
    "autumn": Season((1.7, 0.95, 0.42), (1.04, 0.98, 0.92), "yellow and orange leaves"),
    "winter": Season((0.88, 0.97, 1.12), (0.94, 0.98, 1.06), "pale, cool, bare"),
}


def _mul(*tints: tuple[float, float, float]) -> tuple[float, float, float]:
    out = [1.0, 1.0, 1.0]
    for t in tints:
        out = [a * b for a, b in zip(out, t)]
    return (round(out[0], 4), round(out[1], 4), round(out[2], 4))


def grade(time_of_day: str, weather: str, season: str = "summer") -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    """(background tint, character tint) for a scene."""
    light = LIGHTING_PRESETS[time_of_day]
    w = WEATHER_PRESETS[weather].grade
    sb = SEASON_PRESETS.get(season, SEASON_PRESETS["summer"]).background
    return _mul(light.background, w, sb), _mul(light.character, w)


def foliage_tint(time_of_day: str, weather: str, season: str = "summer") -> tuple[float, float, float]:
    """Tint of vegetation layers: the scene's background grade, the season's leaf colour and the weather's coating."""
    bg, _ = grade(time_of_day, weather, season)
    return _mul(bg, SEASON_PRESETS.get(season, SEASON_PRESETS["summer"]).foliage, WEATHER_PRESETS[weather].foliage)
