"""Phase 7 acceptance: Hindi narration and dialogue, caching, timing, mixing, lip-sync."""
from __future__ import annotations

import base64

import numpy as np
import pytest

from engine.audio.analysis import SAMPLE_RATE, analyse, analyse_file, envelope, read_wav, write_wav
from engine.audio.mixer import AudioMixer
from engine.audio.providers import EspeakProvider, SarvamProvider, ToneProvider, VoiceProvider, make_provider
from engine.audio.soundtrack import build_scene_audio, build_story_audio
from engine.audio.speech import AudioCache, DialogueService, NarrationService, line_key, produce_speech, validate_audio
from engine.audio.timing import GAP, LEAD_IN, layout_shot, retime_story
from engine.audio.voices import VoiceRegistry
from engine.common.errors import AudioError, ProviderUnavailable
from engine.schema.assets import AssetType
from tests.support import scene, shot, story

LINES = [{"line_id": "l1", "speaker": "narrator", "text": "एक नदी के किनारे जामुन का एक बड़ा पेड़ था।"},
         {"line_id": "l2", "speaker": "monkey_001", "text": "मित्र, ये मीठे जामुन खाओ।"},
         {"line_id": "l3", "speaker": "crocodile_001", "text": "वाह! धन्यवाद, मित्र!", "emotion": "happy"}]


def _story(extra_audio=None):
    return story([scene("talk", [shot(seconds=12.0, dialogue=LINES, audio=extra_audio or [])])], story_id="phase07",
                 audio={"narrator_voice": "narrator_hi", "music": {"track_id": "gentle_story_001", "volume": 0.5}})


def _services(library, tmp_path, provider: VoiceProvider):
    narration = NarrationService(provider, VoiceRegistry(library.root / "voices"), AudioCache(tmp_path / "cache"))
    return narration, DialogueService(narration, library)


@pytest.fixture(scope="module")
def spoken(library, tmp_path_factory):
    """The test story voiced by the local Hindi synthesiser (falls back to the tone adapter if espeak-ng is absent)."""
    provider = EspeakProvider() if EspeakProvider().available() else ToneProvider()
    narration, dialogue = _services(library, tmp_path_factory.mktemp("speech"), provider)
    st = _story()
    return st, produce_speech(st, dialogue), dialogue


@pytest.mark.tts
def test_1_generate_hindi_narration(library, tmp_path, artifacts):
    narration, _ = _services(library, tmp_path, EspeakProvider())
    clip = narration.generate_narration("एक नदी के किनारे जामुन का एक बड़ा पेड़ था। उस पेड़ पर एक चतुर बंदर रहता था।", "narrator_hi")
    assert 3.0 < clip.duration < 15.0 and not clip.cached
    assert clip.stats.rms_db == pytest.approx(-20.0, abs=1.5) and clip.stats.clipped_runs == 0 and not clip.stats.silent
    assert validate_audio(clip.path) == []
    (artifacts / "phase07_narration_hi.wav").write_bytes(clip.path.read_bytes())
    assert any(v["id"].startswith("hi") for v in EspeakProvider().get_available_voices())
    assert narration.split_into_segments("पहला वाक्य। दूसरा वाक्य? तीसरा!", max_chars=14) == ["पहला वाक्य।", "दूसरा वाक्य?", "तीसरा!"]


@pytest.mark.tts
def test_2_3_character_dialogue_is_generated_and_stored(spoken, library, artifacts):
    st, speech, dialogue = spoken
    assert not speech.problems and speech.generated == 3
    clips = [speech.clips[line_key("talk", "sh1", f"l{i}")] for i in (1, 2, 3)]
    assert [c.voice_id for c in clips] == ["narrator_hi", "monkey_hi", "crocodile_hi"]       # every speaker has its own voice
    for clip in clips:
        assert clip.path.is_file() and clip.duration > 0.5 and clip.path.with_suffix(".json").is_file()
    def pitch(clip):                                                   # dominant frequency of the voice
        x = read_wav(clip.path)
        spectrum = np.abs(np.fft.rfft(x * np.hanning(len(x))))
        freqs = np.fft.rfftfreq(len(x), 1 / SAMPLE_RATE)
        band = (freqs > 60) & (freqs < 400)
        return freqs[band][spectrum[band].argmax()]
    assert pitch(clips[1]) > pitch(clips[2]) * 1.3                     # the monkey is audibly higher than the crocodile
    for name, clip in zip(("narrator", "monkey", "crocodile"), clips):
        (artifacts / f"phase07_voice_{name}.wav").write_bytes(clip.path.read_bytes())
    assert DialogueService.assign_speaker(dialogue, st.scenes[0].shots[0].dialogue[1], st) == "monkey_hi"
    with pytest.raises(AudioError, match="No voice"):
        dialogue.assign_speaker(st.scenes[0].shots[0].dialogue[1].model_copy(update={"speaker": "stranger_001"}), st)


def test_4_cached_audio_is_reused(library, tmp_path):
    calls = []

    class Counting(ToneProvider):
        def generate_voice(self, text, voice, out_path):
            calls.append(text)
            return super().generate_voice(text, voice, out_path)

    narration, dialogue = _services(library, tmp_path, Counting())
    st = _story()
    first = produce_speech(st, dialogue)
    assert (first.generated, first.reused, len(calls)) == (3, 0, 3)
    second = produce_speech(st, dialogue)
    assert (second.generated, second.reused, len(calls)) == (0, 3, 3)                         # nothing regenerated
    assert all(c.cached for c in second.clips.values())
    assert [c.path for c in first.clips.values()] == [c.path for c in second.clips.values()]
    edited = st.model_copy(deep=True)
    edited.scenes[0].shots[0].dialogue[1].text = "मित्र, ये खट्टे जामुन मत खाओ।"
    third = produce_speech(edited, dialogue)
    assert (third.generated, third.reused) == (1, 2)                                          # only the changed line
    forced = produce_speech(st, dialogue, force=True)
    assert forced.generated == 3                                                              # unless explicitly requested
    other_voice = narration.generate_narration(LINES[1]["text"], "rabbit_hi")
    assert not other_voice.cached                                                             # same text, different voice: different audio


def test_5_6_duration_detection_and_dialogue_timing(spoken):
    st, speech, _ = spoken
    sh = st.scenes[0].shots[0]
    for key, clip in speech.clips.items():
        assert clip.duration == pytest.approx(len(read_wav(clip.path)) / SAMPLE_RATE, abs=0.001)
        assert clip.stats.duration == pytest.approx(clip.duration, abs=0.001)
    timing = speech.scene_timing(st, "talk")["sh1"]
    assert timing.lines[0].start == pytest.approx(LEAD_IN)
    for a, b in zip(timing.lines, timing.lines[1:]):
        assert b.start == pytest.approx(a.start + a.duration + GAP, abs=0.002)                # one after another, never overlapping
    assert [l.speaker for l in timing.lines] == ["narrator", "monkey_001", "crocodile_001"]
    env = timing.lines[1].envelope                                                            # lip-sync data, one value per frame
    assert len(env) == pytest.approx(timing.lines[1].duration * 24, abs=1.5) and max(env) == 1.0 and min(env) == 0.0
    retimed, changes = retime_story(st, speech.durations())
    assert changes and retimed.scenes[0].shots[0].duration_seconds < 12.0                     # the shot tightens to its speech
    assert retimed.scenes[0].shots[0].duration_seconds >= timing.end() + 0.4
    frames = retimed.scenes[0].shots[0].duration_seconds * 24
    assert abs(frames - round(frames)) < 1e-3                                                 # and stays on the frame grid
    explicit = sh.model_copy(deep=True)
    explicit.dialogue[2].start_seconds = 9.0
    assert layout_shot(explicit, speech.durations()).lines[2].start == 9.0


def test_7_mix_narration_and_music_with_ducking(spoken, library, tmp_path, artifacts):
    st, speech, _ = spoken
    result = build_scene_audio(st, "talk", speech, library, tmp_path / "scene.wav", with_music=True)
    assert not result.problems and result.report.tracks == {"narration": 1, "dialogue": 2, "effects": 0, "music": 1}
    assert result.report.ducking_db < 0
    music = read_wav(library.file_path(AssetType.music, "gentle_story_001", "audio.wav"))
    mixer = AudioMixer()
    speech_like = np.zeros(SAMPLE_RATE * 6, dtype=np.float32)
    speech_like[SAMPLE_RATE * 2: SAMPLE_RATE * 4] = 0.3 * np.sin(2 * np.pi * 220 * np.arange(SAMPLE_RATE * 2) / SAMPLE_RATE)
    mixer.add_narration(speech_like, 0.0)
    mixer.add_music(music, 0.0, 0.5, loop_until=6.0)
    ducked, report = mixer.mix(6.0)
    plain, _ = mixer.mix(6.0, duck=False)
    music_only = plain - speech_like[: len(plain)]
    def level(x, a, b):
        return float(np.sqrt(np.mean(x[int(a * SAMPLE_RATE): int(b * SAMPLE_RATE)] ** 2)))
    under_speech = level(ducked - speech_like[: len(ducked)], 2.6, 3.8) / level(music_only, 2.6, 3.8)
    in_the_clear = level(ducked, 0.2, 1.6) / level(music_only, 0.2, 1.6)
    assert under_speech < 0.4 and in_the_clear > 0.95                                         # music dips only under the voice
    (artifacts / "phase07_scene_mix.wav").write_bytes(result.path.read_bytes())


def test_8_clipping_is_detected_and_prevented(tmp_path):
    t = np.arange(SAMPLE_RATE) / SAMPLE_RATE
    hot = np.clip(3.0 * np.sin(2 * np.pi * 200 * t), -1, 1).astype(np.float32)
    stats = analyse(hot)
    assert stats.clipped_runs > 100 and stats.peak_db > -0.1
    path = write_wav(tmp_path / "hot.wav", hot)
    assert any("clipped" in p for p in validate_audio(path))
    assert analyse(0.5 * np.sin(2 * np.pi * 200 * t)).clipped_runs == 0
    assert any("silent" in p for p in validate_audio(write_wav(tmp_path / "silent.wav", np.zeros(SAMPLE_RATE))))
    mixer = AudioMixer()
    for i in range(4):                                                                        # four loud voices at once
        mixer.add_dialogue(f"v{i}", (0.8 * np.sin(2 * np.pi * 200 * t)).astype(np.float32), 0.0)
    mixed, report = mixer.mix(1.0)
    assert report.clipped_samples_before_limiting > 1000 and report.limiter_gain_db < -6
    assert report.clipped_runs == 0 and np.abs(mixed).max() <= 0.95                           # the exported mix never clips


def test_9_export_the_final_audio_track(spoken, library, tmp_path, artifacts):
    st, speech, _ = spoken
    cues = [{"cue_id": "amb", "type": "ambience", "asset_id": "river_ambience_001", "loop": True},
            {"cue_id": "s1", "type": "sfx", "asset_id": "splash_001", "start_seconds": 1.0}]
    st2 = _story(cues)
    result = build_story_audio(st2, speech, library, tmp_path / "final.wav")
    stats = analyse_file(result.path)
    assert stats.duration == pytest.approx(12.0, abs=0.01) and result.duration == 12.0
    assert not stats.silent and stats.clipped_runs == 0 and -30 < stats.rms_db < -10 and stats.peak_db <= -0.4
    assert result.report.tracks["effects"] == 2 and result.report.tracks["music"] == 1
    assert stats.trailing_silence < 0.2 or stats.rms_db < 0                                   # music carries to the end, then fades
    (artifacts / "phase07_final_track.wav").write_bytes(result.path.read_bytes())
    missing = build_story_audio(_story([{"cue_id": "x", "type": "sfx", "asset_id": "thunder_999"}]), speech, library, tmp_path / "m.wav")
    assert missing.problems and "thunder_999" in missing.problems[0]["message"]


def test_lip_sync_envelope_follows_loudness():
    t = np.arange(SAMPLE_RATE * 2) / SAMPLE_RATE
    burst = np.where((t > 0.5) & (t < 1.0), np.sin(2 * np.pi * 180 * t), 0.0).astype(np.float32)
    env = envelope(burst, 24)
    assert len(env) == 48 and max(env[:11]) == 0 and min(env[13:23]) > 0.8 and max(env[25:]) == 0


def test_provider_interface_and_sarvam_adapter(library, tmp_path):
    for provider in (EspeakProvider(), ToneProvider(), SarvamProvider(api_key="")):
        assert isinstance(provider, VoiceProvider)
        assert provider.get_generation_status("job-1")["status"] == "completed"
        assert isinstance(provider.get_available_voices(), list)
    voice = VoiceRegistry(library.root / "voices").get("monkey_hi")
    with pytest.raises(ProviderUnavailable, match="not configured"):
        SarvamProvider(api_key="").generate_voice("नमस्ते", voice, tmp_path / "x.wav")
    seen = {}
    wav = write_wav(tmp_path / "src.wav", 0.3 * np.sin(2 * np.pi * 200 * np.arange(SAMPLE_RATE) / SAMPLE_RATE)).read_bytes()

    def transport(url, headers, body):
        seen.update(url=url, headers=headers, body=body)
        return {"audios": [base64.b64encode(wav).decode()]}

    out = SarvamProvider(api_key="test-key", transport=transport).generate_voice("नमस्ते", voice, tmp_path / "sarvam.wav")
    assert analyse_file(out).duration == pytest.approx(1.0, abs=0.01)
    assert seen["headers"]["api-subscription-key"] == "test-key" and seen["body"]["target_language_code"] == "hi-IN"
    assert seen["body"]["speaker"] == voice.providers["sarvam"]["speaker"] and seen["body"]["inputs"] == ["नमस्ते"]
    with pytest.raises(AudioError, match="no audio"):
        SarvamProvider(api_key="k", transport=lambda *a: {}).generate_voice("नमस्ते", voice, tmp_path / "y.wav")
    with pytest.raises(AudioError, match="Unknown voice provider"):
        make_provider("gramophone")
    with pytest.raises(AudioError, match="Unknown voice"):
        VoiceRegistry(library.root / "voices").get("ghost_voice")
