"""Storyboard builder: StoryAnalysis + library index -> a validated Story Definition.

Everything here is generic staging logic (who stands where, which clip means "swim" for this
rig, which camera suits a line of dialogue). It knows nothing about any particular story.
Assets are looked up, never invented: anything missing is reported in `missing_assets`.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from pydantic import BaseModel, Field

from ..asset_manager.index import CharacterEntry, EnvironmentEntry, LibraryIndex
from ..schema.story import NARRATOR, OutputSpec, Story, parse_story
from .lexicon import pack_for
from .models import ActionBeat, Beat, SceneAnalysis, StoryAnalysis
from .text import word_count

STAGE_W, STAGE_H = 1920, 1080
TRAVEL_SEMANTICS = {"aquatic": ["swim"], "arboreal": ["walk", "run"], "ground": ["walk", "run"]}
NIGHT_MARKERS = {"रात को": "night", "शाम को": "sunset", "सुबह": "morning"}
PLAIN_CAMERAS = ["parallax_drift", "horizontal_pan", "slow_push_in"]


class MissingAsset(BaseModel):
    kind: str
    key: str
    suggested_id: str
    display_name: str = ""
    reason: str = ""


class StoryboardResult(BaseModel):
    story: Story
    missing_assets: list[MissingAsset] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    character_map: dict[str, str] = Field(default_factory=dict, description="entity key -> character id")
    environment_map: dict[str, str] = Field(default_factory=dict, description="scene id -> environment id")


@dataclass
class _Char:
    key: str
    cid: str
    entry: CharacterEntry | None
    habitat: str
    anchor: str | None = None
    xy: tuple[float, float] | None = None
    env_id: str | None = None
    rider_of: str | None = None          # key of the carrier
    on_stage: bool = False
    facing: str = "right"
    expression: str = "neutral"
    state: str = "standing"

    @property
    def rig(self) -> str | None:
        return self.entry.rig_template if self.entry else None


@dataclass
class _ShotDraft:
    data: dict
    cursor: float = 0.3
    counters: dict[str, int] = field(default_factory=dict)

    def next_id(self, prefix: str) -> str:
        self.counters[prefix] = self.counters.get(prefix, 0) + 1
        return f"{self.data['shot_id']}_{prefix}{self.counters[prefix]}"


class StoryboardBuilder:
    def __init__(self, index: LibraryIndex) -> None:
        self.index = index

    # ------------------------------------------------------------------ API
    def build(self, analysis: StoryAnalysis, *, story_id: str, title: str | None = None, output: OutputSpec | None = None,
              visual_style: str = "premium_chibi_anime", genre: str | None = None,
              character_overrides: dict[str, str] | None = None) -> StoryboardResult:
        self.warnings: list[str] = []
        self.missing: list[MissingAsset] = []
        self.pack = pack_for(analysis.language)
        self.fps = (output or OutputSpec()).fps
        spw = self.pack.seconds_per_word if self.pack else 0.4
        overrides = character_overrides or {}

        chars: dict[str, _Char] = {}
        for ent in analysis.entities:
            if ent.kind != "character":
                continue
            cid = overrides.get(ent.key) or ent.matched_asset_id
            entry = self.index.character(cid) if cid else None
            if entry is None:
                cid = cid or f"{ent.key}_001"
                self.missing.append(MissingAsset(kind="character", key=ent.key, suggested_id=cid, display_name=ent.display_name,
                                                 reason=f"No character in the library is known as '{ent.display_name}'"))
            chars[ent.key] = _Char(ent.key, cid, entry, entry.habitat if entry else ent.habitat)

        scenes = []
        env_map: dict[str, str] = {}
        last_index = len(analysis.scenes) - 1
        for si, sa in enumerate(analysis.scenes):
            scene = self._scene(sa, chars, spw, first=si == 0, last=si == last_index)
            env_map[scene["scene_id"]] = scene["environment_id"]
            scenes.append(scene)

        used = [c for c in chars.values() if any(p["character_id"] == c.cid for sc in scenes for sh in sc["shots"] for p in sh["characters"])
                or any(l["speaker"] == c.cid for sc in scenes for sh in sc["shots"] for l in sh["dialogue"])]
        music = self.index.by_tag(self.index.music, "story") or (self.index.music[0] if self.index.music else None)
        story = {
            "story_id": story_id,
            "title": title or analysis.title or story_id,
            "language": analysis.language,
            "genre": genre,
            "moral": analysis.moral,
            "visual_style": visual_style,
            "output": (output or OutputSpec()).model_dump(),
            "audio": {"narrator_voice": "narrator_" + analysis.language.split("-")[0],
                      "music": {"track_id": music.id, "volume": 0.5} if music else None},
            "characters": [{"character_id": c.cid, "asset_version": c.entry.version if c.entry else 1,
                            "voice_id": c.entry.default_voice if c.entry else None} for c in used],
            "scenes": scenes,
            "metadata": {"analyser": analysis.analyser, "generated_by": "storyboard_builder/1"},
        }
        return StoryboardResult(story=parse_story(story), missing_assets=self.missing, warnings=self.warnings,
                                character_map={c.key: c.cid for c in chars.values()}, environment_map=env_map)

    # ---------------------------------------------------------- environment
    def match_environment(self, tags: list[str], habitats: set[str]) -> EnvironmentEntry | None:
        best: tuple[float, EnvironmentEntry] | None = None
        for env in self.index.environments:
            et, st = set(env.tags), set(tags)
            if not et & st:
                continue
            score = len(et & st) / len(et | st)
            if env.habitats and habitats:
                score += 0.15 * len(habitats & set(env.habitats)) / len(habitats)
            if best is None or score > best[0] + 1e-9:
                best = (score, env)
        return best[1] if best else None

    def _scene(self, sa: SceneAnalysis, chars: dict[str, _Char], spw: float, *, first: bool, last: bool) -> dict:
        sid = f"scene_{sa.index:02d}"
        present = [chars[k] for k in sa.characters if k in chars]
        tags = list(sa.location_tags)
        env = self.match_environment(tags, {c.habitat for c in present}) if tags else None
        if env is None and getattr(self, "_prev_env", None) is not None and not tags:
            env = self._prev_env                       # no location named: the story stays where it was
        if env is None:
            suggested = f"{(tags[0] if tags else 'stage')}_001"
            if not any(m.kind == "environment" and m.suggested_id == suggested for m in self.missing):
                self.missing.append(MissingAsset(kind="environment", key=",".join(tags) or "unknown", suggested_id=suggested,
                                                 reason=f"No environment in the library matches the location tags {tags or '[]'}"))
            env_id = suggested
        else:
            env_id = env.id
        self._prev_env = env

        self._stage(present, chars, env, env_id, sa)
        shots = []
        plain = 0
        groups = self._group(sa.beats)
        for gi, beats in enumerate(groups):
            draft = _ShotDraft({"shot_id": f"sc{sa.index:02d}_sh{gi + 1:02d}", "description": beats[0].text[:120],
                                "characters": [], "props": [], "actions": [], "dialogue": [], "effects": [], "audio": []})
            for c in present:
                for beat in beats:
                    emotion = beat.emotions.get(c.key) or (beat.emotion if beat.speaker == c.key and beat.emotion != "neutral" else None)
                    if emotion:
                        c.expression = emotion
            in_shot = [(i, c) for i, c in enumerate(present) if c.on_stage or self._enters(c, beats)]
            in_shot.sort(key=lambda ic: (ic[1].rider_of is not None, ic[0]))        # carriers first: riders copy their facing
            draft.data["characters"] = [self._placement(c, chars, env, i) for i, c in in_shot]
            placed = {p["character_id"] for p in draft.data["characters"]}
            speech = 0.0
            travelled = jumped = False
            focus: str | None = None
            for beat in beats:
                speaker = NARRATOR if beat.kind == "narration" else chars[beat.speaker].cid
                draft.data["dialogue"].append({"line_id": draft.next_id("l"), "speaker": speaker, "text": beat.text, "emotion": beat.emotion})
                speech += word_count(beat.text) * spw + 0.6
                if beat.kind == "dialogue":
                    focus = chars[beat.speaker].cid
                for action in beat.actions:
                    actor = chars.get(action.actor)
                    if actor is None or actor.cid not in placed:
                        continue
                    kind = self._action(draft, action, actor, chars, env, present, beat.actions)
                    travelled |= kind == "travel"
                    jumped |= kind == "jump"
                    focus = focus or actor.cid
                if beat.kind == "narration" and not focus:
                    focus = next((chars[k].cid for k in beat.emotions if k in chars and chars[k].cid in placed), None)
            duration = round(math.ceil(max(speech + 0.4, draft.cursor + 0.4, 2.0) * self.fps - 1e-6) / self.fps, 4)   # whole frames
            draft.data["duration_seconds"] = duration

            is_dialogue = any(b.kind == "dialogue" for b in beats)
            emotional = any(b.emotion in ("surprised", "worried", "angry") or any(e in ("surprised", "worried") for e in b.emotions.values()) for b in beats)
            if beats[-1].is_moral or (last and gi == len(groups) - 1):
                camera = {"preset": "slow_pull_out"}
            elif gi == 0 and not is_dialogue and not travelled:
                camera = {"preset": "slow_push_in" if first else "establishing_wide"}
            elif jumped and focus:
                camera = {"preset": "action_follow", "target": focus}
            elif travelled and focus:
                camera = {"preset": "tracking_shot", "target": focus}
            elif is_dialogue and focus in placed:
                camera = {"preset": "reaction_closeup" if emotional else "character_closeup", "target": focus}
            elif emotional and focus in placed:
                camera = {"preset": "reaction_closeup", "target": focus}
            else:
                camera = {"preset": PLAIN_CAMERAS[plain % len(PLAIN_CAMERAS)]}
                plain += 1
            if camera["preset"] not in self.index.camera_presets and self.index.camera_presets:
                camera = {"preset": "establishing_wide"}
            draft.data["camera"] = camera

            if gi == 0:
                ambience = self._ambience(env)
                if ambience:
                    draft.data["audio"].append({"cue_id": draft.next_id("amb"), "type": "ambience", "asset_id": ambience, "loop": True, "volume": 0.5})
                if env and {"tree", "forest"} & set(env.tags) and "falling_leaves" in self.index.effects:
                    draft.data["effects"].append({"effect_id": draft.next_id("fx"), "type": "falling_leaves", "start_seconds": 0.0,
                                                  "duration_seconds": duration})
            draft.data["animation_level"] = 3 if (travelled or jumped) else (2 if draft.data["actions"] or is_dialogue else 1)
            shots.append(draft.data)
            for c in present:                          # whoever was in the shot and did not leave is on stage
                if c.cid in placed and c.env_id is not None:
                    c.on_stage = True

        time_of_day = next((v for k, v in NIGHT_MARKERS.items() if sa.time_marker and k in sa.time_marker), "day")
        if time_of_day not in self.index.lighting_presets:
            time_of_day = "day"
        fade = 0.5
        return {"scene_id": sid, "title": sa.title, "description": sa.summary, "environment_id": env_id,
                "environment_version": env.version if env else 1, "time_of_day": time_of_day,
                "transition_in": {"type": "fade", "duration_seconds": fade},
                "transition_out": {"type": "fade", "duration_seconds": 1.0 if last else fade},
                "shots": shots}

    # --------------------------------------------------------------- staging
    def _stage(self, present: list[_Char], chars: dict[str, _Char], env: EnvironmentEntry | None, env_id: str, sa: SceneAnalysis) -> None:
        """Decide where everybody is when the scene opens."""
        present_keys = {c.key for c in present}
        taken: set[str] = set()
        for c in chars.values():
            if c.key not in present_keys:
                c.on_stage = False
                c.env_id = None
        entering = {c.key for c in present if self._first_action(c, sa) in ("arrive", "swim", "walk", "run")}
        for i, c in enumerate(present):
            c.expression = "neutral"
            if c.rider_of and c.rider_of in present_keys:
                c.env_id, c.on_stage = env_id, True       # still riding: follows the carrier
                continue
            c.rider_of = None
            same_place = c.env_id == env_id and c.anchor is not None and c.key not in entering
            if not same_place:
                c.anchor = self._default_anchor(c, env, taken, sa.location_tags)
                c.xy = None if c.anchor else (500.0 + 520.0 * i, 230.0)
            if c.anchor:
                taken.add(c.anchor)
            c.env_id = env_id
            c.on_stage = c.key not in entering
            c.state = self._state_at(c, env)
        for c in present:
            self._face(c, present, env)

    def _default_anchor(self, c: _Char, env: EnvironmentEntry | None, taken: set[str], tags: list[str]) -> str | None:
        if env is None or not env.anchors:
            return None
        options = list(env.default_anchor_by_role.get(c.habitat, [])) + list(env.default_anchor_by_role.get("ground", []))
        options += [n for n, a in env.anchors.items() if "offstage" not in a.features]
        for name in options:
            if name in env.anchors and name not in taken:
                return name
        return options[0] if options else None

    def _state_at(self, c: _Char, env: EnvironmentEntry | None) -> str:
        if c.rider_of:
            return "sitting"
        feats = env.anchors[c.anchor].features if env and c.anchor in (env.anchors if env else {}) else []
        if "water" in feats and c.habitat == "aquatic":
            return "in_water"
        return "sitting" if "seat" in feats else "standing"

    def _x(self, c: _Char, env: EnvironmentEntry | None, chars: dict[str, _Char] | None = None) -> float:
        if c.rider_of and chars and c.rider_of in chars:
            return self._x(chars[c.rider_of], env)
        if env and c.anchor in env.anchors:
            return env.anchors[c.anchor].x
        return c.xy[0] if c.xy else STAGE_W / 2

    def _face(self, c: _Char, present: list[_Char], env: EnvironmentEntry | None) -> None:
        others = [o for o in present if o.key != c.key and o.key != c.rider_of and o.rider_of != c.key]
        if others:
            c.facing = "right" if sum(self._x(o, env) for o in others) / len(others) >= self._x(c, env) else "left"
        elif c.rider_of:
            carrier = next((o for o in present if o.key == c.rider_of), None)
            c.facing = carrier.facing if carrier else c.facing

    @staticmethod
    def _first_action(c: _Char, sa: SceneAnalysis) -> str | None:
        for beat in sa.beats:
            for a in beat.actions:
                if a.actor == c.key:
                    return a.semantic
        return None

    @staticmethod
    def _enters(c: _Char, beats: list[Beat]) -> bool:
        return any(a.actor == c.key and a.semantic in ("arrive", "swim", "walk", "run") for b in beats for a in b.actions)

    @staticmethod
    def _group(beats: list[Beat]) -> list[list[Beat]]:
        """One shot per beat, except that quiet narration lines are read over a single shot."""
        groups: list[list[Beat]] = []
        for beat in beats:
            quiet = beat.kind == "narration" and not beat.actions and not beat.is_moral
            if groups and quiet and len(groups[-1]) < 2 and all(b.kind == "narration" and not b.actions and not b.is_moral for b in groups[-1]):
                groups[-1].append(beat)
            else:
                groups.append([beat])
        return groups

    def _offstage(self, c: _Char, env: EnvironmentEntry | None, toward_x: float) -> tuple[dict, float]:
        """Where a character waits before entering, or goes when leaving: (position, its x)."""
        if env:
            wanted = "water" if c.habitat == "aquatic" else "ground"
            names = [n for n, a in env.anchors.items() if "offstage" in a.features]
            names.sort(key=lambda n: ((wanted not in env.anchors[n].features), abs(env.anchors[n].x - toward_x)))
            if names:
                return {"anchor": names[0]}, env.anchors[names[0]].x
        y = env.anchors[c.anchor].y if env and c.anchor in env.anchors else 230.0
        x = -320.0 if toward_x < STAGE_W / 2 else STAGE_W + 320.0
        return {"x": x, "y": y}, x

    def _placement(self, c: _Char, chars: dict[str, _Char], env: EnvironmentEntry | None, order: int) -> dict:
        if c.rider_of:
            carrier = chars[c.rider_of]
            pos = {"anchor": carrier.anchor} if carrier.anchor else {"x": carrier.xy[0], "y": carrier.xy[1]}
            c.facing = carrier.facing
            return {"character_id": c.cid, "position": pos, "facing": c.facing, "state": "sitting", "expression": c.expression,
                    "order": order + 1, "attach_to": {"character_id": carrier.cid, "part": self._attach_point(carrier)}}
        if c.on_stage:
            pos = {"anchor": c.anchor} if c.anchor else {"x": c.xy[0], "y": c.xy[1]}
        else:
            # Enter from the far side of whoever is already there, so the arrival crosses open stage.
            others = [self._x(o, env) for o in chars.values()
                      if o.on_stage and o.key != c.key and o.env_id == c.env_id and o.rider_of != c.key]
            target_x = self._x(c, env)
            side_x = (0.0 if (sum(others) / len(others)) > target_x else STAGE_W) if others else (0.0 if target_x < STAGE_W / 2 else STAGE_W)
            pos, from_x = self._offstage(c, env, side_x)
            c.facing = "right" if from_x < target_x else "left"
        return {"character_id": c.cid, "position": pos, "facing": c.facing, "state": c.state, "expression": c.expression, "order": order}

    @staticmethod
    def _attach_point(carrier: _Char) -> str:
        points = carrier.entry.attach_points if carrier.entry else []
        return "back" if "back" in points or not points else points[0]

    # --------------------------------------------------------------- actions
    def _clip(self, c: _Char, semantics: list[str]) -> str | None:
        if not c.rig:
            return None
        for s in semantics:
            clip = self.index.animation_for(s, c.rig)
            if clip:
                return clip.code
        return None

    def _add(self, draft: _ShotDraft, c: _Char, clip: str, duration: float, **extra) -> dict:
        action = {"action_id": draft.next_id("a"), "character_id": c.cid, "animation": clip,
                  "start_seconds": round(draft.cursor, 2), "duration_seconds": round(duration, 2), **extra}
        draft.data["actions"].append(action)
        draft.cursor += duration + 0.15
        return action

    def _sfx(self, draft: _ShotDraft, tag: str, at: float) -> None:
        sfx = self.index.by_tag(self.index.sound_effects, tag)
        if sfx:
            draft.data["audio"].append({"cue_id": draft.next_id("sfx"), "type": "sfx", "asset_id": sfx.id, "start_seconds": round(at, 2)})

    def _fx(self, draft: _ShotDraft, kind: str, at: float, duration: float, follow: _Char) -> None:
        if kind in self.index.effects:
            draft.data["effects"].append({"effect_id": draft.next_id("fx"), "type": kind, "start_seconds": round(at, 2),
                                          "duration_seconds": round(duration, 2), "follow_character": follow.cid})

    def _action(self, draft: _ShotDraft, a: ActionBeat, c: _Char, chars: dict[str, _Char], env: EnvironmentEntry | None,
                present: list[_Char], siblings: list[ActionBeat]) -> str | None:
        """Translate one analysed action into scheduled clips. Returns "travel", "jump" or None."""
        sem = a.semantic
        others = [o for o in present if o.key != c.key]
        target = chars.get(a.target_entity) if a.target_entity else None

        if sem in ("swim", "walk", "run") and not c.on_stage:
            return None                                  # the manner of an arrival; the "arrive" action moves the character
        if sem == "arrive":
            if c.on_stage:
                return None
            clip = self._clip(c, TRAVEL_SEMANTICS.get(c.habitat, ["walk"]))
            dest = {"anchor": c.anchor} if c.anchor else {"x": c.xy[0], "y": c.xy[1]} if c.xy else None
            if not clip or not dest:
                c.on_stage = True
                return None
            start = draft.cursor
            self._add(draft, c, clip, 3.0, move_to=dest, loop=True)
            if c.habitat == "aquatic":
                self._fx(draft, "ripples", start, 3.0, c)
                self._sfx(draft, "swim", start)
            c.on_stage = True
            self._face(c, present, env)
            return "travel"
        if sem == "leave":
            clip = self._clip(c, TRAVEL_SEMANTICS.get(c.habitat, ["walk"]))
            away = [self._x(o, env, chars) for o in others if o.on_stage and o.rider_of != c.key]
            here = self._x(c, env)
            side_x = (0.0 if (sum(away) / len(away)) > here else STAGE_W) if away else (0.0 if here < STAGE_W / 2 else STAGE_W)
            if clip:
                start = draft.cursor
                dest, to_x = self._offstage(c, env, side_x)
                self._add(draft, c, clip, 3.0, move_to=dest, loop=True, facing="left" if to_x < here else "right")
                if c.habitat == "aquatic":
                    self._fx(draft, "ripples", start, 3.0, c)
                    self._sfx(draft, "swim", start)
            c.on_stage = False
            c.env_id = None
            return "travel"
        if sem == "sit" and a.target == "back" and target and target.on_stage:
            clip = self._clip(c, ["jump"])
            if clip:
                start = draft.cursor
                self._add(draft, c, clip, 1.2, target_character=target.cid, params={"attach_part": self._attach_point(target)})
                self._sfx(draft, "jump", start)
                if target.habitat == "aquatic":
                    self._fx(draft, "splash", start + 1.0, 0.9, target)
                    self._sfx(draft, "splash", start + 1.0)
            c.rider_of, c.state, c.anchor, c.xy = target.key, "sitting", None, None
            return "jump"
        if sem in ("climb", "jump") and (a.target == "tree" or (sem == "climb" and a.target is None)):
            dest = env.anchor_with("tree") if env else None
            clip = self._clip(c, ["jump"] if c.rider_of else [sem, "jump"])
            if dest and clip:
                start = draft.cursor
                self._add(draft, c, clip, 1.3, move_to={"anchor": dest})
                self._sfx(draft, "jump", start)
                c.rider_of, c.anchor, c.xy = None, dest, None
                c.state = self._state_at(c, env)
                self._face(c, present, env)
                return "jump"
            return None
        if sem == "jump":
            # "jumped and climbed the tree" / "jumped onto its back" is one leap, staged by the later action
            leads_somewhere = any(s.actor == a.actor and s is not a and s.semantic in ("climb", "sit") and s.target in ("tree", "back", None)
                                  for s in siblings)
            clip = self._clip(c, ["jump"])
            if clip and not leads_somewhere and a.target != "from_tree":
                start = draft.cursor
                self._add(draft, c, clip, 1.0)
                self._sfx(draft, "jump", start)
                return "jump"
            return None
        if sem in ("throw", "give"):
            clip = self._clip(c, [sem, "throw", "give"])
            receiver = target or next((o for o in others if o.on_stage), None)
            prop = self._prop(a.prop)
            if clip:
                start = draft.cursor
                extra: dict = {}
                if prop and receiver:
                    inst = draft.next_id("p")
                    draft.data["props"].append({"prop_id": prop, "instance_id": inst, "position": self._pos(c),
                                                "held_by": {"character_id": c.cid, "part": "hand"},
                                                "visible_from": round(start, 2), "visible_until": round(start + 1.4, 2)})
                    extra = {"prop_id": inst, "target_character": receiver.cid}
                self._add(draft, c, clip, 1.4, **extra)
                self._sfx(draft, "throw", start + 0.4)
            return None
        if sem in ("eat", "drink"):
            clip = self._clip(c, [sem, "eat"])
            prop = self._prop(a.prop)
            if clip:
                start = draft.cursor
                extra = {}
                if prop:
                    inst = draft.next_id("p")
                    draft.data["props"].append({"prop_id": prop, "instance_id": inst, "position": self._pos(c),
                                                "held_by": {"character_id": c.cid, "part": "mouth"},
                                                "visible_from": round(start, 2), "visible_until": round(start + 1.6, 2)})
                    extra = {"prop_id": inst}
                self._add(draft, c, clip, 2.0, **extra)
                self._sfx(draft, "eat", start + 0.3)
            return None
        simple = {"laugh": ["happy_reaction"], "cry": ["sad_reaction"], "sit": ["sit"], "fall": ["fall"], "fly": ["fly"],
                  "run": ["run"], "walk": ["walk"], "swim": ["swim"], "look": ["look_left", "turn_head"], "pick_up": ["pick_up"],
                  "sleep": ["sit"]}
        if sem in simple:
            clip = self._clip(c, simple[sem])
            if clip:
                entry = self.index.animation(clip)
                if entry and entry.start_states != ["*"] and c.state not in entry.start_states:
                    return None
                self._add(draft, c, clip, max(1.2, entry.duration if entry else 1.2), loop=bool(entry and entry.loop))
                if entry and entry.end_state:
                    c.state = entry.end_state
            else:
                self.warnings.append(f"No animation for '{sem}' fits {c.cid} ({c.rig or 'no rig'})")
        return None

    def _pos(self, c: _Char) -> dict:
        return {"anchor": c.anchor} if c.anchor else {"x": c.xy[0] if c.xy else 960.0, "y": c.xy[1] if c.xy else 300.0}

    def _prop(self, tag: str | None) -> str | None:
        if not tag:
            return None
        prop = self.index.by_tag(self.index.props, tag)
        if prop is None and not any(m.kind == "prop" and m.key == tag for m in self.missing):
            self.warnings.append(f"No prop tagged '{tag}' in the library; the action plays without it")
        return prop.id if prop else None

    def _ambience(self, env: EnvironmentEntry | None) -> str | None:
        if not env:
            return None
        if env.ambience and any(s.id == env.ambience for s in self.index.sound_effects):
            return env.ambience
        for sfx in self.index.sound_effects:
            if "ambience" in sfx.tags and set(sfx.tags) & set(env.tags):
                return sfx.id
        return None
