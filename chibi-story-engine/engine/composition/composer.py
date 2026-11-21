"""Scene composer: one scene of a Story Definition + library assets (+ speech timing) -> ScenePlan.

All staging is resolved here, in plain Python: anchors to coordinates, actions to poses, travel and
riding to root motion, props, effects, layer motion, lighting and the guarded camera.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from ..animation.easing import ease
from ..animation.player import Catalogue
from ..animation.timeline import PoseTimeline, schedule
from ..asset_manager.library import AssetLibrary
from ..audio.timing import ShotTiming, layout_shot, scene_offsets, synthetic_envelope
from ..camera.guards import constrain, frame_fraction
from ..environment_manager.bounds import cover_layers
from ..camera.presets import CAMERA_PRESETS, Target, evaluate_camera
from ..camera.projection import CameraState
from ..character_manager.registry import CharacterRegistry
from ..character_manager.rig import Pose, Rig, apply, rotate, scale, translate
from ..common.errors import AssetIntegrityError, AssetNotFound, EngineError, RigError, ValidationFailed
from ..environment_manager.lighting import LIGHTING_PRESETS, SEASON_PRESETS, WEATHER_PRESETS, foliage_tint, grade
from ..schema.assets import AssetType, CharacterManifest, EnvironmentManifest
from ..schema.story import Easing, Position, Scene, Shot, Story, iter_actions
from .effects import EFFECT_ASSET, EFFECT_SPRITES, EFFECT_TYPES, EffectContext
from .plan import ScenePlan, ShotPlan, SpriteTrack

RELEASE_AT = 0.38          # fraction of a throw/give after which the prop leaves the hand


@dataclass
class Issue:
    severity: str            # "error" | "warning"
    code: str
    path: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return {"severity": self.severity, "code": self.code, "path": self.path, "message": self.message}


@dataclass
class ComposeConfig:
    width: int = 1920
    height: int = 1080
    fps: int = 24


@dataclass
class _Actor:
    cid: str
    manifest: CharacterManifest
    rig: Rig
    asset_dir: str
    scale: float
    order: float
    timeline: PoseTimeline
    pos: np.ndarray                       # (n, 2) root position on stage
    facing: np.ndarray                    # (n,)  +1 right, -1 left
    visible: bool = True
    attach: dict[str, np.ndarray] = field(default_factory=dict)   # attach point name -> (n, 2) stage positions
    bounds: np.ndarray | None = None      # (n, 4)
    height: float = 300.0


class SceneComposer:
    def __init__(self, library: AssetLibrary) -> None:
        self.library = library
        self.registry = CharacterRegistry(library)
        self.catalogue = Catalogue(library.animations())
        self._rigs: dict[tuple[str, int], tuple[CharacterManifest, Rig]] = {}
        self._checksums: dict[str, str] = {}

    # ------------------------------------------------------------------ API
    def compose(self, story: Story, scene_id: str, timing: dict[str, ShotTiming] | None = None,
                config: ComposeConfig | None = None, strict: bool = True) -> tuple[ScenePlan, list[Issue]]:
        config = config or ComposeConfig(story.output.width, story.output.height, story.output.fps)
        scene = story.scene(scene_id)
        self.issues: list[Issue] = []
        self._scene_path = f"scene({scene.scene_id})"
        env = self._environment(scene)
        if scene.time_of_day not in LIGHTING_PRESETS:
            self._err("unknown_lighting", self._scene_path, f"unknown time_of_day '{scene.time_of_day}' (have: {', '.join(LIGHTING_PRESETS)})")
        if scene.season not in SEASON_PRESETS:
            self._err("unknown_season", self._scene_path, f"unknown season '{scene.season}' (have: {', '.join(SEASON_PRESETS)})")
        if scene.weather not in WEATHER_PRESETS:
            self._err("unknown_weather", self._scene_path, f"unknown weather '{scene.weather}' (have: {', '.join(WEATHER_PRESETS)})")
        versions = {c.character_id: c.asset_version for c in story.characters}
        offsets = scene_offsets(scene)
        shots: list[ShotPlan] = []
        if env is not None and not any(i.severity == "error" for i in self.issues):
            for shot in scene.shots:
                shot_timing = (timing or {}).get(shot.shot_id) or layout_shot(shot)
                shots.append(self._shot(story, scene, shot, env, versions, shot_timing, offsets[shot.shot_id], config))
        errors = [i for i in self.issues if i.severity == "error"]
        if errors and strict:
            raise ValidationFailed(f"Scene '{scene_id}' cannot be composed ({len(errors)} problem{'s' if len(errors) != 1 else ''})",
                                   [{"path": i.path, "message": i.message, "code": i.code} for i in errors])
        plan = ScenePlan(scene.scene_id, config.fps, config.width, config.height, shots,
                         fade_in=scene.transition_in.duration_seconds if scene.transition_in.type == "fade" else 0.0,
                         fade_out=scene.transition_out.duration_seconds if scene.transition_out.type == "fade" else 0.0,
                         meta={"story_id": story.story_id, "environment": scene.environment_id, "time_of_day": scene.time_of_day})
        return plan, self.issues

    # -------------------------------------------------------------- helpers
    def _err(self, code: str, path: str, message: str) -> None:
        self.issues.append(Issue("error", code, path, message))

    def _warn(self, code: str, path: str, message: str) -> None:
        self.issues.append(Issue("warning", code, path, message))

    def _checksum(self, asset_type: str, asset_id: str, rel: str, version: int | None, path: str) -> str:
        key = f"{asset_type}/{asset_id}/{version}/{rel}"
        if key not in self._checksums:
            entry = self.library.load(asset_type, asset_id, version).file_entry(rel)
            self._checksums[key] = entry.checksum if entry else ""
        return self._checksums[key]

    def _environment(self, scene: Scene) -> EnvironmentManifest | None:
        try:
            env = self.library.environment(scene.environment_id, scene.environment_version)
            self.library.require_intact(AssetType.environment, scene.environment_id, scene.environment_version)
            return env
        except (AssetNotFound, AssetIntegrityError, ValidationFailed) as exc:
            self._err("missing_asset" if isinstance(exc, AssetNotFound) else exc.code, self._scene_path,
                      f"environment '{scene.environment_id}' v{scene.environment_version}: {exc.message}")
            return None

    def _character(self, cid: str, version: int, path: str, view: str | None = None) -> tuple[CharacterManifest, Rig] | None:
        key = (cid, version, view or "")
        if key not in self._rigs:
            try:
                manifest = self.library.character(cid, version)
                rig_issues = self.registry.rig_issues(manifest)
                if rig_issues:
                    raise RigError(f"rig is not usable: {rig_issues[0]['message']}")
                self.library.require_intact(AssetType.character, cid, version)
                primary = manifest.compatibility.get("primary_view", "front")
                if view and view != primary:
                    if view not in manifest.views:
                        have = ", ".join([primary, *manifest.views])
                        raise RigError(f"has no '{view}' view (has: {have})")
                    hidden = sorted({p.id for p in manifest.rig.parts} - {p.id for p in manifest.views[view].parts})        # drawn in other views, not in this one
                    manifest = manifest.model_copy(update={"rig": manifest.views[view], "compatibility": {**manifest.compatibility, "hidden_in_view": hidden}})     # every later step reads manifest.rig
                self._rigs[key] = (manifest, Rig(manifest.rig))
            except EngineError as exc:
                code = "missing_asset" if isinstance(exc, AssetNotFound) else exc.code
                self._err(code, path, f"character '{cid}' v{version}: {exc.message}")
                return None
        return self._rigs[key]

    def _resolve(self, pos: Position, env: EnvironmentManifest, path: str) -> tuple[float, float, int, float, list[str]]:
        """Position -> (x, y, order, scale, anchor features)."""
        if pos.anchor is not None:
            anchor = env.anchors.get(pos.anchor)
            if anchor is None:
                self._err("unknown_anchor", path, f"environment '{env.id}' has no anchor '{pos.anchor}' (has: {', '.join(env.anchors)})")
                return 960.0 + pos.offset[0], 300.0 + pos.offset[1], 100, 1.0, []
            return anchor.x + pos.offset[0], anchor.y + pos.offset[1], anchor.order, anchor.scale, list(anchor.features)
        return float(pos.x) + pos.offset[0], float(pos.y) + pos.offset[1], 100, 1.0, []

    # ----------------------------------------------------------------- shot
    def _shot(self, story: Story, scene: Scene, shot: Shot, env: EnvironmentManifest, versions: dict[str, int],
              timing: ShotTiming, offset: float, config: ComposeConfig) -> ShotPlan:
        fps = config.fps
        n = max(1, int(round(shot.duration_seconds * fps)))
        path = f"{self._scene_path}.shot({shot.shot_id})"
        tod = scene.time_of_day if scene.time_of_day in LIGHTING_PRESETS else "day"
        wx = scene.weather if scene.weather in WEATHER_PRESETS else "clear"
        sea = scene.season if scene.season in SEASON_PRESETS else "summer"
        bg_tint, char_tint = grade(tod, wx, sea)
        leaf_tint = foliage_tint(tod, wx, sea)
        wind = WEATHER_PRESETS.get(scene.weather, WEATHER_PRESETS["clear"]).wind
        plan = ShotPlan(shot.shot_id, n, np.zeros((n, 3)))
        times = offset + np.arange(n) / fps

        for layer in env.layers:
            if layer.scare > scene.scare_level:
                continue                                  # a scarier layer of a haunted place, hidden for a gentler scene
            plan.sprites.append(self._layer(env, scene.environment_version, layer, n, times, wind,
                                            {"background": bg_tint, "character": char_tint, "foliage": leaf_tint,
                                             "none": (1.0, 1.0, 1.0)}[layer.tint_group]))

        actors = self._actors(story, shot, env, versions, timing, offset, n, fps, path)
        for actor in actors.values():
            if actor.visible:
                plan.sprites.extend(self._character_sprites(actor, versions[actor.cid], n, char_tint))
        self._props(shot, env, actors, plan, n, fps, path, char_tint)
        self._effects(shot, scene, env, actors, plan, n, fps, path)

        target = self._camera_target(shot, env, actors, n, path)
        if not shot.camera.keyframes and shot.camera.preset not in CAMERA_PRESETS:
            self._err("unknown_camera_preset", f"{path}.camera", f"unknown camera preset '{shot.camera.preset}'")
            states = [CameraState()] * n
        else:
            states = evaluate_camera(shot.camera, n, fps, target)
        covers = cover_layers(env)
        clamped = 0
        for i, state in enumerate(states):
            safe = constrain(state, covers)
            if abs(safe.x - state.x) > 0.5 or abs(safe.y - state.y) > 0.5 or abs(safe.zoom - state.zoom) > 1e-3:
                clamped += 1
            plan.camera[i] = (safe.x, safe.y, safe.zoom)
        if clamped:
            plan.notes.append(f"camera limited on {clamped} of {n} frames to stay inside the environment")
        self._visibility(shot, actors, plan, timing, fps, path)
        return plan

    def _layer(self, env, version, layer, n, times, wind, tint) -> SpriteTrack:
        x, y, w, h = layer.rect
        image = str(self.library.file_path(AssetType.environment, env.id, layer.file, version))
        affine = np.tile(np.array([w, 0.0, 0.0, h, x, y], dtype=float), (n, 1))
        for m in layer.motion:
            phase = 2 * math.pi * times / m.period + m.phase
            if m.type == "scroll":
                period = m.amplitude or w
                affine[:, 4] -= np.mod(m.speed * times, period)
            elif m.type == "bob":
                affine[:, 5] += m.amplitude * np.sin(phase)
            elif m.type == "drift":
                affine[:, 4] += m.speed * times
            elif m.type == "sway":
                px, py = m.pivot or (x + w / 2, y)
                angles = np.radians(m.amplitude * (wind if m.wind_scaled else 1.0)) * np.sin(phase)
                for i, ang in enumerate(angles):
                    c, s = math.cos(ang), math.sin(ang)
                    a, b, cc, d, tx, ty = affine[i]
                    affine[i] = (c * a - s * b, s * a + c * b, c * cc - s * d, s * cc + c * d,
                                 px + c * (tx - px) - s * (ty - py), py + s * (tx - px) + c * (ty - py))
        return SpriteTrack(f"env.{layer.id}", image, self._checksum("environment", env.id, layer.file, version, image),
                           layer.parallax, float(layer.order), tint, affine, np.ones(n))

    # --------------------------------------------------------------- actors
    def _actors(self, story, shot, env, versions, timing, offset, n, fps, path) -> dict[str, _Actor]:
        shot_seconds = n / fps
        flat: dict[str, list[tuple]] = {}
        for action, start in iter_actions(shot.actions):
            if action.character_id:
                flat.setdefault(action.character_id, []).append((action, start))

        # carriers must be solved before whoever rides them or jumps onto them
        deps: dict[str, set[str]] = {c.character_id: set() for c in shot.characters}
        for c in shot.characters:
            if c.attach_to:
                deps[c.character_id].add(c.attach_to.character_id)
            for action, _ in flat.get(c.character_id, []):
                if action.target_character and "attach_part" in action.params:
                    deps[c.character_id].add(action.target_character)
        order: list[str] = []
        pending = dict(deps)
        while pending:
            ready = [cid for cid, d in pending.items() if not (d & set(pending))]
            if not ready:
                self._err("attachment_cycle", path, f"characters are attached to each other in a circle: {', '.join(pending)}")
                break
            for cid in ready:
                order.append(cid)
                del pending[cid]

        placements = {c.character_id: c for c in shot.characters}
        actors: dict[str, _Actor] = {}
        for index, cid in enumerate(order):
            placement = placements[cid]
            cpath = f"{path}.character({cid})"
            loaded = self._character(cid, versions.get(cid, 1), cpath, placement.view)
            if loaded is None:
                continue
            manifest, rig = loaded
            x, y, base_order, anchor_scale, features = self._resolve(placement.position, env, cpath)
            unit = float(manifest.compatibility.get("stage_scale", 0.6)) * placement.scale * anchor_scale

            raw = [{"action_id": a.action_id, "animation": a.animation, "start": s, "duration": a.duration_seconds, "loop": a.loop,
                    "expression": a.expression} for a, s in flat.get(cid, [])]
            scheduled, sched_issues = schedule(manifest, self.catalogue, raw, shot_seconds, self.registry.check_animation)
            talk = self._talk_track(cid, timing, n, fps)
            timeline = PoseTimeline(cid, manifest, rig, self.catalogue, placement.state, placement.expression, fps, n, scheduled,
                                    placement.pose, talk, seed=story.story_id, time_offset=offset)
            for issue in sched_issues + timeline.issues:
                self._err(issue.code, f"{cpath}.action({issue.action_id})" if issue.action_id else cpath, issue.message)
            if placement.pose and placement.pose not in manifest.poses:
                self._err("unknown_pose", cpath, f"'{cid}' has no pose '{placement.pose}' (has: {', '.join(manifest.poses) or 'none'})")
            if placement.state not in manifest.states:
                self._warn("unknown_state", cpath, f"'{cid}' does not declare the state '{placement.state}'")

            carrier = actors.get(placement.attach_to.character_id) if placement.attach_to else None
            if placement.attach_to and carrier is None:
                self._err("missing_carrier", cpath, f"'{cid}' is attached to '{placement.attach_to.character_id}', which could not be loaded")
            if carrier is not None and placement.attach_to.part not in carrier.manifest.rig.attach_points:
                self._err("unknown_attach_point", cpath, f"'{carrier.cid}' has no attach point '{placement.attach_to.part}'")
                carrier = None

            pos = np.zeros((n, 2))
            facing = np.full(n, 1.0 if placement.facing == "right" else -1.0)
            current = np.array([x, y], dtype=float)
            attached = (carrier, placement.attach_to.part, np.array(placement.attach_to.offset)) if carrier else None
            final_order = base_order if attached is None else carrier.order + 1
            travels = []
            by_id = {a.action_id: a for a in scheduled}
            for action, start in flat.get(cid, []):
                sched = by_id.get(action.action_id)
                if sched is None:
                    continue
                apath = f"{cpath}.action({action.action_id})"
                clip = sched.clip
                if clip.requires_feature and clip.requires_feature not in features and placement.position.anchor:
                    dest_features = self._resolve(action.move_to, env, apath)[4] if action.move_to and action.move_to.anchor else features
                    if clip.requires_feature not in dest_features:
                        self._err("constraint_violation", apath,
                                  f"'{clip.code}' needs a place with '{clip.requires_feature}', but '{cid}' is at '{placement.position.anchor}'")
                if clip.requires_prop and not action.prop_id:
                    self._warn("missing_prop", apath, f"'{clip.code}' is meant to be played with a prop")
                dest = None
                if action.target_character and "attach_part" in action.params:
                    tgt = actors.get(action.target_character)
                    part = str(action.params["attach_part"])
                    if tgt is None or part not in tgt.manifest.rig.attach_points:
                        self._err("unknown_attach_point", apath, f"cannot attach to '{action.target_character}' at '{part}'")
                        continue
                    dest = ("attach", tgt, part)
                    final_order = tgt.order + 1
                elif action.move_to is not None:
                    dx, dy, dorder, _, dfeat = self._resolve(action.move_to, env, apath)
                    dest = ("point", np.array([dx, dy]), dorder)
                    features = dfeat or features
                if dest is not None:
                    travels.append((sched, action, dest))
                elif action.facing:
                    travels.append((sched, action, None))
            travels.sort(key=lambda tr: tr[0].start)

            leg_start: np.ndarray | None = None
            active = None
            for f in range(n):
                t = f / fps
                if active is not None and t >= active[0].end:
                    sched, action, dest = active
                    if dest and dest[0] == "attach":
                        attached = (dest[1], dest[2], np.zeros(2))
                    elif dest:
                        current = dest[1].copy()
                        attached = None
                        final_order = dest[2] if attached is None and not any(d and d[0] == "attach" for _, _, d in travels) else final_order
                    if action.facing:
                        facing[f:] = 1.0 if action.facing == "right" else -1.0
                    active = None
                if active is None:
                    nxt = next((tr for tr in travels if tr[0].start - 1e-9 <= t < tr[0].end), None)
                    if nxt is not None:
                        active = nxt
                        leg_start = (attached[0].attach[attached[1]][f] + attached[2]) if attached else current.copy()
                        if nxt[2] is not None:
                            attached = None
                if attached is not None:
                    pos[f] = attached[0].attach[attached[1]][f] + attached[2]
                elif active is not None and active[2] is not None:
                    sched, action, dest = active
                    k = min(1.0, max(0.0, (t - sched.start) / max(sched.duration, 1e-6)))
                    goal = dest[1].attach[dest[2]][f] if dest[0] == "attach" else dest[1]
                    e = ease(sched.clip.root_motion.ease if sched.clip.root_motion.path != "none" else Easing.ease_in_out, k)
                    pos[f] = leg_start + (goal - leg_start) * e
                    if sched.clip.root_motion.path == "arc" or dest[0] == "attach":
                        pos[f, 1] += (sched.clip.root_motion.arc_height or 160.0) * 4 * k * (1 - k)
                    if abs(goal[0] - leg_start[0]) > 30 and not action.facing:
                        facing[f:] = 1.0 if goal[0] > leg_start[0] else -1.0
                    elif action.facing:
                        facing[f:] = 1.0 if action.facing == "right" else -1.0
                    if sched.clip.max_speed and sched.duration > 0:
                        speed = float(np.linalg.norm(goal - leg_start)) / sched.duration
                        if speed > sched.clip.max_speed and f == int(sched.start * fps):
                            self._err("constraint_violation", f"{cpath}.action({action.action_id})",
                                      f"'{sched.clip.code}' would move at {speed:.0f} px/s, faster than its limit of {sched.clip.max_speed:.0f}")
                    current = pos[f].copy()
                else:
                    pos[f] = current

            actor = _Actor(cid, manifest, rig, str(self.library.asset_dir(AssetType.character, cid, versions.get(cid, 1))), unit,
                           final_order + 0.1 * index + 0.3 * placement.order, timeline, pos, facing, placement.visible)
            self._solve(actor, n)
            actors[cid] = actor
        return actors

    @staticmethod
    def _talk_track(cid: str, timing: ShotTiming, n: int, fps: int) -> list[float] | None:
        lines = [l for l in timing.lines if l.speaker == cid]
        if not lines:
            return None
        track = [0.0] * n
        for line in lines:
            env = line.envelope if line.envelope is not None else synthetic_envelope(line.duration, fps)
            start = int(round(line.start * fps))
            for i, v in enumerate(env):
                if 0 <= start + i < n:
                    track[start + i] = max(track[start + i], float(v))
        return track

    def _solve(self, actor: _Actor, n: int) -> None:
        """Pose every frame; store sprite matrices, attach points and bounds in stage space."""
        rig = actor.rig
        names = list(rig.definition.attach_points)
        actor.attach = {name: np.zeros((n, 2)) for name in names}
        actor.bounds = np.zeros((n, 4))
        actor._frames = []                                      # type: ignore[attr-defined]
        rest = rig.bounds(Pose())
        actor.height = (rest[3] - rest[1]) * actor.scale
        for f in range(n):
            pose = actor.timeline.pose_at(f)
            stage = translate(actor.pos[f, 0], actor.pos[f, 1]) @ scale(actor.scale * actor.facing[f], actor.scale)
            world = rig.world_matrices(pose)
            for name in names:
                ap = rig.definition.attach_points[name]
                actor.attach[name][f] = apply(stage @ world[ap.part], rig.to_rig(ap.point))
            sprites = [(s.part, s.variant, s.file, s.order, stage @ s.matrix) for s in rig.solve(pose)]
            actor._frames.append(sprites)                       # type: ignore[attr-defined]
            xs, ys = [], []
            for *_, m in sprites:
                for u, v in ((0, 0), (1, 0), (1, 1), (0, 1)):
                    xs.append(m[0, 0] * u + m[0, 1] * v + m[0, 2])
                    ys.append(m[1, 0] * u + m[1, 1] * v + m[1, 2])
            actor.bounds[f] = (min(xs), min(ys), max(xs), max(ys)) if xs else (actor.pos[f, 0], actor.pos[f, 1], actor.pos[f, 0], actor.pos[f, 1])

    def _character_sprites(self, actor: _Actor, version: int, n: int, tint) -> list[SpriteTrack]:
        tracks: dict[tuple[str, str], SpriteTrack] = {}
        for f, sprites in enumerate(actor._frames):             # type: ignore[attr-defined]
            for part, variant, file, order, m in sprites:
                key = (part, variant)
                track = tracks.get(key)
                if track is None:
                    image = str(self.library.file_path(AssetType.character, actor.cid, file, version))
                    track = tracks[key] = SpriteTrack(
                        f"char.{actor.cid}.{part}.{variant}", image, self._checksum("character", actor.cid, file, version, image),
                        1.0, actor.order + (order + 10) * 0.004, tint, np.zeros((n, 6)), np.zeros(n))
                track.affine[f] = (m[0, 0], m[1, 0], m[0, 1], m[1, 1], m[0, 2], m[1, 2])
                track.opacity[f] = 1.0
        for track in tracks.values():                           # hidden frames keep a valid transform
            shown = np.nonzero(track.opacity)[0]
            for f in np.nonzero(track.opacity == 0)[0]:
                track.affine[f] = track.affine[shown[np.argmin(np.abs(shown - f))]]
        return sorted(tracks.values(), key=lambda t: t.order)

    # ---------------------------------------------------------------- props
    def _props(self, shot, env, actors, plan, n, fps, path, tint) -> None:
        moves = {}
        for action, start in iter_actions(shot.actions):
            if action.prop_id:
                moves[action.prop_id] = (action, start)
        for placement in shot.props:
            pid = placement.instance_id or placement.prop_id
            ppath = f"{path}.prop({pid})"
            try:
                manifest = self.library.prop(placement.prop_id, placement.asset_version)
                image = str(self.library.file_path(AssetType.prop, placement.prop_id, manifest.file, placement.asset_version))
            except EngineError as exc:
                self._err("missing_asset", ppath, f"prop '{placement.prop_id}': {exc.message}")
                continue
            x, y, order, _, _ = self._resolve(placement.position, env, ppath)
            centre = np.tile(np.array([x, y], dtype=float), (n, 1))
            holder = actors.get(placement.held_by.character_id) if placement.held_by else None
            if placement.held_by and (holder is None or placement.held_by.part not in holder.attach):
                self._err("unknown_attach_point", ppath, f"prop cannot be held at '{placement.held_by.part}' of '{placement.held_by.character_id}'")
                holder = None
            if holder is not None:
                centre = holder.attach[placement.held_by.part] + np.array(placement.held_by.offset)
                order = holder.order + 0.09
            opacity = np.zeros(n)
            first = int(round(placement.visible_from * fps))
            last = n if placement.visible_until is None else min(n, int(round(placement.visible_until * fps)))
            opacity[first:last] = 1.0
            move = moves.get(pid)
            if move and move[0].target_character in actors:
                action, start = move
                receiver = actors[action.target_character]
                goal_name = "mouth" if "mouth" in receiver.attach else next(iter(receiver.attach), None)
                duration = action.duration_seconds or 1.0
                f0, f1 = int((start + duration * RELEASE_AT) * fps), int((start + duration) * fps)
                thrown = self.catalogue.clips.get(action.animation)
                arc = 170.0 if thrown is not None and "throw" in thrown.metadata.get("semantics", []) else 30.0
                centre = centre.copy()
                for f in range(f0, n):
                    k = min(1.0, (f - f0) / max(1, f1 - f0))
                    goal = receiver.attach[goal_name][f] if goal_name else receiver.pos[f]
                    centre[f] = centre[min(f0, n - 1)] + (goal - centre[min(f0, n - 1)]) * k
                    centre[f, 1] += arc * 4 * k * (1 - k)
                order = max(order, receiver.order + 0.09)
            w, h = manifest.size[0] * placement.scale, manifest.size[1] * placement.scale
            r = math.radians(placement.rotation)
            c, s = math.cos(r), math.sin(r)
            a, b, cc, d = w * c, w * s, -h * s, h * c
            px, py = manifest.pivot
            affine = np.zeros((n, 6))
            affine[:, 0:4] = (a, b, cc, d)
            affine[:, 4] = centre[:, 0] - (a * px + cc * py)
            affine[:, 5] = centre[:, 1] - (b * px + d * py)
            plan.sprites.append(SpriteTrack(f"prop.{pid}", image, self._checksum("prop", placement.prop_id, manifest.file, placement.asset_version, image),
                                            1.0, order + 0.3 * placement.order, tint, affine, opacity))

    # -------------------------------------------------------------- effects
    def _effects(self, shot, scene, env, actors, plan, n, fps, path) -> None:
        effects = [(e.effect_id, e.type, e.start_seconds, e.duration_seconds, e.position, e.follow_character, dict(e.params)) for e in shot.effects]
        weather = WEATHER_PRESETS.get(scene.weather)
        if weather and weather.effect:
            effects.append((f"{shot.shot_id}_weather", weather.effect, 0.0, n / fps, None, None, {}))
        for i, (extra_type, extra_params) in enumerate(weather.extra if weather else ()):
            effects.append((f"{shot.shot_id}_weather{i + 2}", extra_type, 0.0, n / fps, None, None, dict(extra_params)))
        if not effects:
            return
        try:
            asset = self.library.effect(EFFECT_ASSET)
        except EngineError as exc:
            self._err("missing_asset", path, f"effect sprites '{EFFECT_ASSET}': {exc.message}")
            return
        for eid, etype, start, duration, position, follow, params in effects:
            epath = f"{path}.effect({eid})"
            make = EFFECT_TYPES.get(etype)
            if make is None:
                self._err("unknown_effect", epath, f"unknown effect '{etype}' (have: {', '.join(sorted(EFFECT_TYPES))})")
                continue
            order = 500.0
            if follow and follow in actors:
                origin = [tuple(p) for p in actors[follow].pos]
                order = actors[follow].order + 0.095
            elif position is not None:
                x, y, o, _, _ = self._resolve(position, env, epath)
                origin, order = [(x, y)] * n, o + 0.095
            else:
                origin = [(960.0, 540.0)] * n
            ctx = EffectContext(f"{shot.shot_id}:{eid}", fps, n, min(n - 1, int(round(start * fps))), max(1, int(round(duration * fps))),
                                origin, params, order)
            for i, particle in enumerate(make(ctx)):
                rel = asset.sprites.get(particle.sprite)
                if rel is None:
                    self._err("missing_asset", epath, f"effect sprite '{particle.sprite}' is not in '{EFFECT_ASSET}'")
                    break
                image = str(self.library.file_path(AssetType.effect, EFFECT_ASSET, rel))
                plan.sprites.append(SpriteTrack(f"fx.{eid}.{i}", image, self._checksum("effect", EFFECT_ASSET, rel, None, image),
                                                particle.parallax, (particle.order if particle.order is not None else order) + i * 0.0005,
                                                (1.0, 1.0, 1.0), particle.affine, particle.opacity))

    # --------------------------------------------------------------- camera
    def _camera_target(self, shot, env, actors, n, path) -> Target | None:
        name = shot.camera.target
        if not name:
            return None
        actor = actors.get(name)
        if actor is not None:
            if "head_top" in actor.attach and "mouth" in actor.attach:
                mid = (actor.attach["head_top"] + actor.attach["mouth"]) / 2
                span = float(np.linalg.norm(actor.attach["head_top"][0] - actor.attach["mouth"][0]))
                return Target([tuple(p) for p in mid], height=max(160.0, span * 2.2))
            centre = np.column_stack([(actor.bounds[:, 0] + actor.bounds[:, 2]) / 2, (actor.bounds[:, 1] + actor.bounds[:, 3]) / 2])
            return Target([tuple(p) for p in centre], height=actor.height)
        if name in env.anchors:
            return Target([(env.anchors[name].x, env.anchors[name].y + 150.0)] * n)
        self._err("unknown_camera_target", f"{path}.camera", f"camera target '{name}' is neither a character in the shot nor an anchor")
        return None

    def _visibility(self, shot, actors, plan, timing, fps, path) -> None:
        """Whoever speaks should be on screen while speaking."""
        for line in timing.lines:
            actor = actors.get(line.speaker)
            if actor is None or not actor.visible:
                continue
            f = min(plan.n_frames - 1, int((line.start + line.duration / 2) * fps))
            share = frame_fraction(tuple(actor.bounds[f]), CameraState(*plan.camera[f]))
            if share < 0.5:
                self._warn("speaker_off_screen", f"{path}.dialogue({line.line_id})",
                           f"'{line.speaker}' is only {share:.0%} in frame while speaking")
