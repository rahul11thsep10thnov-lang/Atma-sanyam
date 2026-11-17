"""Rule-based story analyser: deterministic, offline, driven entirely by a LanguagePack."""
from __future__ import annotations

import re
from dataclasses import dataclass

from ..asset_manager.index import LibraryIndex, norm_name
from ..common.errors import ValidationFailed
from ..schema.story import NARRATOR
from .lexicon import LanguagePack, pack_for, supported_languages
from .models import ActionBeat, Beat, Entity, SceneAnalysis, StoryAnalysis, parse_analysis
from .text import Segment, detect_language, normalise, segment_paragraph, split_paragraphs, word_count

MAX_PURE_ATTRIBUTION_WORDS = 5
EMOTIVE_ACTIONS = {"laugh", "cry"}


@dataclass
class _Mention:
    key: str
    start: int
    end: int


class _EntityFinder:
    """Finds character mentions; longer names win ("X की पत्नी" before "X")."""

    def __init__(self, pack: LanguagePack, index: LibraryIndex | None) -> None:
        self.pack = pack
        self.entities: dict[str, Entity] = {}
        self._patterns: list[tuple[re.Pattern[str], str]] = []
        self._relation_patterns: list[tuple[re.Pattern[str], str, str]] = []
        self._bare_relations: list[tuple[re.Pattern[str], str]] = []
        self._lexicon = {w.key: w for w in pack.entities}
        self._index = index

        surfaces: list[tuple[str, str]] = [(name, w.key) for w in pack.entities for name in w.names]
        # Library characters known only by their aliases (not in the generic lexicon) are found too.
        known = {norm_name(n) for n, _ in surfaces}
        for ch in (index.characters if index else []):
            for alias in ch.aliases:
                if norm_name(alias) not in known and not self._is_relation_alias(alias) and self._script_ok(alias):
                    surfaces.append((alias, self._key_for_asset(ch.id)))
                    self._lexicon.setdefault(self._key_for_asset(ch.id), None)  # type: ignore[arg-type]
        surfaces.sort(key=lambda s: -len(s[0]))
        self._patterns = [(re.compile(pack.name_pattern(n), re.IGNORECASE), k) for n, k in surfaces]
        for word, rel in pack.relations.items():
            for name, key in surfaces:
                pat = pack.name_pattern(name)
                if pack.code == "hi":
                    full = pat + pack.relation_joiner + pack.name_pattern(word)
                else:
                    full = rf"(?<!\w){re.escape(name)}{pack.relation_joiner}{re.escape(word)}(?!\w)"
                self._relation_patterns.append((re.compile(full, re.IGNORECASE), key, rel))
            self._bare_relations.append((re.compile(pack.name_pattern(word), re.IGNORECASE), rel))

    def _script_ok(self, alias: str) -> bool:
        devanagari = any("ऀ" <= c <= "ॿ" for c in alias)
        return devanagari == (self.pack.code == "hi")

    def _is_relation_alias(self, alias: str) -> bool:
        return any(word in alias for word in self.pack.relations)

    @staticmethod
    def _key_for_asset(asset_id: str) -> str:
        return re.sub(r"_\d+$", "", asset_id)

    def find(self, text: str) -> list[_Mention]:
        taken = [False] * len(text)
        out: list[_Mention] = []

        def claim(m: re.Match[str], key: str) -> None:
            if not any(taken[m.start():m.end()]):
                for i in range(m.start(), m.end()):
                    taken[i] = True
                out.append(_Mention(key, m.start(), m.end()))

        for pat, owner, rel in self._relation_patterns:
            for m in pat.finditer(text):
                claim(m, f"{owner}_{rel}")
        for pat, key in self._patterns:
            for m in pat.finditer(text):
                claim(m, key)
        for pat, rel in self._bare_relations:
            for m in pat.finditer(text):
                claim(m, f"?{rel}")
        return sorted(out, key=lambda m: m.start)

    def register(self, mentions: list[_Mention], text: str) -> None:
        for m in mentions:
            if m.key.startswith("?"):
                continue
            ent = self.entities.get(m.key)
            if ent is None:
                ent = self.entities[m.key] = self._new_entity(m.key, text[m.start:m.end])
            ent.mention_count += 1

    def _new_entity(self, key: str, surface: str) -> Entity:
        word = self._lexicon.get(key)
        if word is not None:
            return Entity(key=key, display_name=word.names[0], species=word.species, habitat=word.habitat,
                          kind="group" if word.group else "character", names=[*word.names, key.replace("_", " ")])
        for rel_word, rel in self.pack.relations.items():
            if key.endswith("_" + rel):
                owner = self._lexicon.get(key[: -len(rel) - 1])
                owner_name = owner.names[0] if owner else key[: -len(rel) - 1]
                joiner = " की " if self.pack.code == "hi" else "'s "
                names = [f"{n}{joiner}{rel_word}" for n in (owner.names if owner else (owner_name,))]
                return Entity(key=key, display_name=names[0], species=owner.species if owner else "unknown",
                              habitat=owner.habitat if owner else "ground", names=[*names, key.replace("_", " ")])
        return Entity(key=key, display_name=surface.strip(), names=[surface.strip(), key.replace("_", " ")])

    def resolve(self, mention: _Mention) -> str | None:
        """Turn a bare relation ("पत्नी") into the one entity it can mean, if unambiguous."""
        if not mention.key.startswith("?"):
            return mention.key
        rel = mention.key[1:]
        matches = [k for k in self.entities if k.endswith("_" + rel)]
        return matches[0] if len(matches) == 1 else None


class RuleBasedAnalyser:
    name = "rule_based"

    def __init__(self, index: LibraryIndex | None = None) -> None:
        self.index = index

    def analyse(self, text: str, language: str | None = None) -> StoryAnalysis:
        if not text or not text.strip():
            raise ValidationFailed("The story text is empty", [{"path": "text", "message": "nothing to analyse"}])
        text = normalise(text)
        guess = detect_language(text)
        lang = language or guess.code
        pack = pack_for(lang)
        if pack is None:
            raise ValidationFailed(
                f"Language '{lang}' is not supported by the rule-based analyser",
                [{"path": "language", "message": f"supported languages: {', '.join(supported_languages())}; use an LLM provider for others"}])
        warnings: list[str] = []
        if language and guess.code.split("-")[0] != language.split("-")[0] and guess.confidence > 0.6:
            warnings.append(f"The text looks like '{guess.code}' but was submitted as '{language}'")

        paragraphs = split_paragraphs(text)
        title, moral, body = self._split_frame(paragraphs, pack)
        if not body:
            raise ValidationFailed("The story has no body text", [{"path": "text", "message": "only a title or moral was found"}])

        finder = _EntityFinder(pack, self.index)
        segmented = [segment_paragraph(p) for p in body]
        for segs in segmented:                     # pass 1: who exists (narration only)
            for s in segs:
                if s.kind == "narration":
                    finder.register(finder.find(s.text), s.text)

        scenes: list[SceneAnalysis] = []
        state = _Carry()
        for segs in segmented:                     # pass 2: beats
            scene = self._scene(len(scenes) + 1, segs, pack, finder, state)
            if scene:
                scenes.append(scene)
        if not scenes:
            raise ValidationFailed("No scenes could be extracted", [{"path": "text", "message": "no sentences found"}])
        if moral:
            scenes[-1].beats.append(Beat(kind="narration", text=moral, is_moral=True))
        for sc in scenes:
            sc.estimated_duration = round(sum(self._beat_seconds(b, pack) for b in sc.beats), 2)

        entities = [e for e in finder.entities.values()]
        self._match_assets(entities, warnings)
        represented = sum(_letters(b.text) for sc in scenes for b in sc.beats if not b.is_moral)
        total = sum(_letters(p) for p in body)
        coverage = round(represented / total, 3) if total else 0.0
        if coverage < 0.8:      # short "X said," lead-ins are dropped on purpose, so some shortfall is normal
            warnings.append(f"Only {coverage:.0%} of the story text is represented in beats")
        if not any(e.kind == "character" for e in entities):
            warnings.append("No characters were recognised; add them to the lexicon or the character library aliases")

        analysis = StoryAnalysis(analyser=self.name, language=lang if "-" in lang else guess.code, language_confidence=guess.confidence,
                                 title=title, moral=moral, entities=entities, scenes=scenes, warnings=warnings, coverage=min(coverage, 1.5))
        return parse_analysis(analysis.model_dump())

    # ---------------------------------------------------------------- pieces
    @staticmethod
    def _split_frame(paragraphs: list[str], pack: LanguagePack) -> tuple[str | None, str | None, list[str]]:
        title = moral = None
        body = list(paragraphs)
        if len(body) > 1 and "\n" not in body[0] and word_count(body[0]) <= 10 and body[0][-1] not in "।.?!\"":
            title = body.pop(0)
        for i in range(len(body) - 1, -1, -1):
            m = re.match(rf"^(?:{'|'.join(map(re.escape, pack.moral_markers))})\s*[:：\-–]\s*(.+)$", body[i], re.IGNORECASE | re.DOTALL)
            if m:
                moral = m.group(1).strip()
                body.pop(i)
                break
        return title, moral, body

    def _scene(self, number: int, segs: list[Segment], pack: LanguagePack, finder: _EntityFinder, state: "_Carry") -> SceneAnalysis | None:
        beats: list[Beat] = []
        present: list[str] = []
        tags: list[str] = []
        time_marker = None
        narration_text = " ".join(s.text for s in segs if s.kind == "narration")
        for marker in pack.time_markers:
            if marker in narration_text:
                time_marker = marker
                break
        for pat, tag in pack.locations:
            if re.search(pat, narration_text) and tag not in tags:
                tags.append(tag)

        def see(key: str) -> None:
            ent = finder.entities.get(key)
            if ent and ent.kind == "character" and key not in present:
                present.append(key)

        pending: tuple[str | None, str] | None = None   # (speaker, emotion) from a lead-in
        carried: list[ActionBeat] = []
        i = 0
        while i < len(segs):
            seg = segs[i]
            nxt = segs[i + 1] if i + 1 < len(segs) else None
            if seg.kind == "narration":
                mentions = finder.find(seg.text)
                keys = [k for k in (finder.resolve(m) for m in mentions) if k]
                for k in keys:
                    see(k)
                subject = self._subject(seg.text, mentions, finder, pack) or state.subject
                emotion = self._emotion(seg.text, pack.emotions)
                is_leadin = nxt is not None and nxt.kind == "quote" and not seg.terminated and re.search(pack.speech_verbs, seg.text)
                actions = self._actions(seg.text, subject, mentions, finder, pack)
                if is_leadin:
                    speaker = self._speaker(seg.text, mentions, finder, pack) or state.subject
                    pending = (speaker, emotion)
                    if speaker:
                        state.subject = speaker
                        see(speaker)
                    pure = word_count(seg.text) <= MAX_PURE_ATTRIBUTION_WORDS and all(a.semantic in EMOTIVE_ACTIONS for a in actions)
                    carried = actions if pure else []
                    if not pure:
                        beats.append(Beat(kind="narration", text=_clean_leadin(seg.text, pack), actions=actions,
                                          emotions={speaker: emotion} if speaker and emotion != "neutral" else {}))
                else:
                    if subject:
                        state.subject = subject
                    beats.append(Beat(kind="narration", text=seg.text, actions=actions,
                                      emotions={subject: emotion} if subject and emotion != "neutral" and subject in finder.entities else {}))
                i += 1
                continue

            # quoted speech
            speaker, emotion = pending if pending else (None, "neutral")
            quote_actions, carried = (carried if pending else []), []
            consumed_tail = False
            if speaker is None and nxt is not None and nxt.kind == "narration" and re.search(pack.speech_verbs, nxt.text) \
                    and word_count(nxt.text) <= MAX_PURE_ATTRIBUTION_WORDS + 2:
                tail_mentions = finder.find(nxt.text)
                speaker = self._speaker(nxt.text, tail_mentions, finder, pack)
                emotion = self._emotion(nxt.text, pack.emotions)
                consumed_tail = speaker is not None
            if speaker is None:
                speaker = state.other_speaker(present)
            if speaker is None:
                beats.append(Beat(kind="narration", text=seg.text))
                state.unattributed += 1
            else:
                see(speaker)
                if emotion == "neutral":
                    emotion = self._emotion(seg.text, pack.quote_emotions)
                addressee = next((k for k in reversed(present) if k != speaker), None)
                beats.append(Beat(kind="dialogue", text=seg.text, speaker=speaker, addressee=addressee, emotion=emotion,
                                  actions=[a for a in quote_actions if a.actor == speaker]))
                state.last_speaker = speaker
            # a second quote right after keeps the same speaker; otherwise the lead-in is spent
            if not (nxt is not None and nxt.kind == "quote"):
                pending = None
            i += 2 if consumed_tail else 1

        if not beats:
            return None
        first = next((b.text for b in beats if b.kind == "narration"), beats[0].text)
        title = first if len(first) <= 48 else first[:45].rstrip() + "…"
        return SceneAnalysis(index=number, title=title, summary=first, location_tags=tags, time_marker=time_marker,
                             characters=present, beats=beats)

    @staticmethod
    def _candidates(text: str, mentions: list[_Mention], finder: _EntityFinder, pack: LanguagePack) -> list[str]:
        out = []
        for m in mentions:
            key = finder.resolve(m)
            if key and key in finder.entities and not re.match(pack.object_markers, text[m.end:]):
                # "X ने" is the ergative subject marker in Hindi, never an object
                out.append(key)
        return out

    def _subject(self, text: str, mentions: list[_Mention], finder: _EntityFinder, pack: LanguagePack) -> str | None:
        c = self._candidates(text, mentions, finder, pack)
        return c[0] if c else None

    def _speaker(self, text: str, mentions: list[_Mention], finder: _EntityFinder, pack: LanguagePack) -> str | None:
        c = self._candidates(text, mentions, finder, pack)
        if c:
            return c[-1]
        resolved = [k for k in (finder.resolve(m) for m in mentions) if k and k in finder.entities]
        return resolved[-1] if resolved else None

    @staticmethod
    def _emotion(text: str, table: tuple[tuple[str, str], ...]) -> str:
        best: tuple[int, str] | None = None
        for pat, emotion in table:
            m = re.search(pat, text)
            if m and (best is None or m.start() < best[0]):
                best = (m.start(), emotion)
        return best[1] if best else "neutral"

    @staticmethod
    def _actions(text: str, subject: str | None, mentions: list[_Mention], finder: _EntityFinder, pack: LanguagePack) -> list[ActionBeat]:
        if not subject or subject not in finder.entities:
            return []
        found: list[tuple[int, str]] = []
        for pat, semantic in pack.actions:
            for m in re.finditer(pat, text):
                if not any(abs(m.start() - p) < 2 for p, _ in found):
                    found.append((m.start(), semantic))
        found.sort()
        spans = [(m.start(), m.end(), tag) for pat, tag in pack.targets for m in re.finditer(pat, text)]
        # "X के पास" beats the bare "के पास" inside it: keep only phrases not contained in a longer one
        targets = [(a, tag) for a, b, tag in spans if not any((c <= a and b <= d) and (d - c) > (b - a) for c, d, _ in spans)]
        objects = [finder.resolve(m) for m in mentions if re.match(r"\s*को(?![\u0900-\u097F])", text[m.end:])] if pack.code == "hi" else []
        prop = next((tag for pat, tag in pack.props if re.search(pat, text)), None)
        others = [(m.start, finder.resolve(m)) for m in mentions if finder.resolve(m) not in (None, subject)]
        out: list[ActionBeat] = []
        seen: set[str] = set()
        for pos, semantic in found:
            if semantic in seen:
                continue
            seen.add(semantic)
            # nearest target phrase at or before the verb (Hindi is verb-final), else none
            before = [t for t in targets if t[0] <= pos]
            target = max(before)[1] if before else None
            target_entity = None
            if target in ("back", "near") or semantic in ("give", "throw"):
                near = [k for p, k in others if p <= pos and finder.entities.get(k or "")]
                target_entity = near[-1] if near else None
            out.append(ActionBeat(actor=subject, semantic=semantic, target=target, target_entity=target_entity,
                                  prop=prop if semantic in ("eat", "throw", "give", "pick_up", "drink") else None))
            if semantic == "arrive" and re.search(r"ले (?:गया|गई|गए|आया|आई|चला)", text):
                # "took X along": whoever was taken arrives too
                out += [ActionBeat(actor=k, semantic="arrive", target=target) for k in objects
                        if k and k != subject and finder.entities.get(k) and finder.entities[k].kind == "character"]
        return out

    @staticmethod
    def _beat_seconds(beat: Beat, pack: LanguagePack) -> float:
        speech = word_count(beat.text) * pack.seconds_per_word + 0.6
        return max(speech, 1.2 * len(beat.actions), 1.5)

    def _match_assets(self, entities: list[Entity], warnings: list[str]) -> None:
        if not self.index:
            return
        for ent in entities:
            names = {norm_name(n) for n in [ent.key, ent.display_name, *ent.names]}
            matches = sorted(c.id for c in self.index.characters if names & c.names())
            ent.candidate_asset_ids = matches
            ent.matched_asset_id = matches[0] if matches else None
            if len(matches) > 1:
                warnings.append(f"'{ent.display_name}' matches several characters ({', '.join(matches)}); using {matches[0]}")


class _Carry:
    """What carries over from sentence to sentence: the current subject and who spoke last."""

    def __init__(self) -> None:
        self.subject: str | None = None
        self.last_speaker: str | None = None
        self.unattributed = 0

    def other_speaker(self, present: list[str]) -> str | None:
        others = [k for k in present if k != self.last_speaker]
        if self.last_speaker and others:
            return others[-1]
        return self.subject if self.subject in present else (present[-1] if present else None)


def _letters(text: str) -> int:
    return sum(1 for c in text if c.isalnum() or "ऀ" <= c <= "ॿ")


def _clean_leadin(text: str, pack: LanguagePack) -> str:
    text = text.rstrip(" ,:;-–")
    return text + ("।" if pack.code == "hi" else ".")
