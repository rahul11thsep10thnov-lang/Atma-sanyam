import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { assignVoices } from "../src/studio/media/voiceAssignment";
import { BASE_VOICES } from "../src/studio/media/voiceCatalog";
import { buildStyleBible, buildVisualPrompt } from "../src/studio/media/visualPromptBuilder";
import { encodePng } from "../src/studio/media/png";
import { buildLanguageTimeline, commonSceneFloors } from "../src/studio/rendering/audioTimeline";
import { buildSubtitleCues, chunkText, cuesToAss } from "../src/studio/rendering/subtitles";
import { buildMixArgs, buildMuxArgs, buildPlacedTrackArgs, buildSceneClipArgs, zoompanFilter } from "../src/studio/rendering/ffmpegCommands";
import { VoiceRouter } from "../src/studio/providers/voice/VoiceRouter";
import { VoiceProvider } from "../src/studio/providers/voice/VoiceProvider";
import { wavDurationSeconds } from "../src/studio/providers/voice/audioProbe";
import { buildSilentWav } from "../src/modules/tts/wavUtils";
import { contentHash } from "../src/studio/hashing";

const voices = BASE_VOICES.map((v) => ({ ...v, isActive: true }));

describe("voice assignment", () => {
  it("keeps the narrator voice exclusive, uses authoritative voices for officials and avoids clashes", () => {
    const result = assignVoices({
      characters: [
        { key: "CHAR_01", gender: "FEMALE", ageGroup: "ADULT", isOfficial: false, isMinor: false, speaks: true },
        { key: "CHAR_02", gender: "FEMALE", ageGroup: "ADULT", isOfficial: false, isMinor: false, speaks: false },
        { key: "CHAR_03", gender: "FEMALE", ageGroup: "ADULT", isOfficial: true, isMinor: false, speaks: true },
      ],
      voices,
      narratorVoiceCode: "VOICE_08",
      sceneCharacters: [["CHAR_01", "CHAR_02"]],
      locked: [],
    });
    const by = Object.fromEntries(result.map((r) => [r.speakerKey, r.voiceCode]));
    expect(by.NARRATOR).toBe("VOICE_08");
    expect(by.CHAR_03).toBe("VOICE_02"); // VOICE_08 is taken by the narrator
    expect(by.CHAR_01).toBe("VOICE_02");
    expect(by.CHAR_02).not.toBe(by.CHAR_01); // co-appear in a scene
    expect(Object.values(by).filter((v) => v === "VOICE_08")).toHaveLength(1);
  });

  it("keeps admin-locked assignments", () => {
    const result = assignVoices({
      characters: [{ key: "CHAR_01", gender: "MALE", ageGroup: "ADULT", isOfficial: false, isMinor: false, speaks: true }],
      voices,
      narratorVoiceCode: "VOICE_08",
      sceneCharacters: [],
      locked: [{ speakerKey: "CHAR_01", voiceCode: "VOICE_03" }],
    });
    expect(result.find((r) => r.speakerKey === "CHAR_01")?.voiceCode).toBe("VOICE_03");
  });
});

describe("voice routing", () => {
  const fake = (key: string, langs: string[], configured = true, id: string | null = "x"): VoiceProvider => ({
    key,
    isConfigured: () => configured,
    supportsLanguage: (l) => langs.includes(l),
    resolveVoiceId: () => id,
    synthesize: async () => ({ audio: Buffer.alloc(0), format: "wav", durationSeconds: 0, isPlaceholder: false }),
  });
  const voice = { code: "VOICE_01", gender: "MALE" as const, ageGroup: "ADULT" as const, tone: "NEUTRAL", providerVoiceIds: {} };

  it("picks the first provider that supports the language and has a voice ID; never assumes support", () => {
    const router = new VoiceRouter([fake("elevenlabs", ["en", "hi"]), fake("google", ["hi", "ta", "en"])]);
    expect(router.route(voice, "hi").provider.key).toBe("elevenlabs");
    expect(router.route(voice, "ta").provider.key).toBe("google");
    const fallback = router.route(voice, "as");
    expect(fallback.provider.key).toBe("mock");
    expect(fallback.isFallback).toBe(true);
    expect(fallback.reason).toContain("as not supported");
  });

  it("skips providers that are not configured or have no voice ID", () => {
    const router = new VoiceRouter([fake("elevenlabs", ["hi"], false), fake("chatterbox", ["hi"], true, null), fake("google", ["hi"])]);
    expect(router.route(voice, "hi").provider.key).toBe("google");
  });
});

describe("visual prompts", () => {
  const bible = buildStyleBible({
    storyId: "s1",
    animationStyle: "flat-2d-editorial",
    characters: [
      { key: "CHAR_01", displayName: "Sunita", role: "wife", gender: "FEMALE", ageGroup: "ADULT", isMinor: false, appearance: { clothing: "teal saree", build: "average", hair: "dark", accessories: "none", palette: "teal" } },
      { key: "CHAR_02", displayName: "a minor", role: "son", gender: "MALE", ageGroup: "CHILD", isMinor: true, appearance: null },
    ],
  });
  const base = { sceneNumber: 2, location: "home interior, Jaipur", timeOfDay: "night" as const, characters: ["CHAR_01", "CHAR_02"], background: "home interior in Jaipur", props: ["window"], cameraDirection: "slow pan left", emotionalTone: "serious" };

  it("keeps character appearance consistent and never draws minors", () => {
    const p = buildVisualPrompt(base, { level: "SAFE", topics: [] }, bible, []);
    expect(p.prompt).toContain("teal saree");
    expect(p.prompt).not.toContain("son");
    expect(p.negativePrompt).toContain("blood");
    expect(p.motion).toBe("pan-left");
  });

  it("replaces restricted scenes with a people-free substitute and is deterministic", () => {
    const p = buildVisualPrompt(base, { level: "RESTRICTED", topics: ["dead_body"] }, bible, []);
    expect(p.isSubstitute).toBe(true);
    expect(p.prompt).toContain("No people in frame");
    expect(p.prompt).not.toContain("teal saree");
    expect(buildVisualPrompt(base, { level: "RESTRICTED", topics: ["dead_body"] }, bible, []).hash).toBe(p.hash);
  });

  it("shows people only as silhouettes in sensitive scenes", () => {
    expect(buildVisualPrompt(base, { level: "SENSITIVE", topics: ["violence"] }, bible, []).prompt).toContain("silhouettes");
  });
});

describe("PNG encoder", () => {
  it("writes a valid PNG", () => {
    const png = encodePng(2, 1, new Uint8Array([255, 0, 0, 0, 0, 255]));
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    const idatLength = png.readUInt32BE(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    expect([...raw]).toEqual([0, 255, 0, 0, 0, 0, 255]);
  });
});

describe("audio timeline and sync", () => {
  const segs = [
    { sceneNumber: 1, lineIndex: 0, speakerKey: "NARRATOR", durationSeconds: 3, text: "Scene one narration." },
    { sceneNumber: 2, lineIndex: 0, speakerKey: "NARRATOR", durationSeconds: 8, text: "Scene two narration." },
    { sceneNumber: 2, lineIndex: 1, speakerKey: "CHAR_01", durationSeconds: 4, text: "A quote." },
  ];

  it("fits scenes to speech, never shorter than 5s, and places lines in order", () => {
    const tl = buildLanguageTimeline("en", [1, 2], segs);
    expect(tl.scenes[0].durationSeconds).toBe(5);
    expect(tl.scenes[1].durationSeconds).toBeCloseTo(0.4 + 8 + 0.35 + 4 + 0.6);
    const quote = tl.segments.find((s) => s.lineIndex === 1)!;
    const narration = tl.segments.find((s) => s.sceneNumber === 2 && s.lineIndex === 0)!;
    expect(quote.startSeconds).toBeCloseTo(narration.startSeconds + 8 + 0.35);
    expect(quote.track).toBe("DIALOGUE");
    for (const s of tl.segments) {
      const scene = tl.scenes.find((x) => x.sceneNumber === s.sceneNumber)!;
      expect(s.startSeconds + s.durationSeconds).toBeLessThanOrEqual(scene.startSeconds + scene.durationSeconds + 1e-6);
    }
  });

  it("builds a shared master timeline for multi-audio packages", () => {
    const hi = buildLanguageTimeline("hi", [1, 2], segs.map((s) => ({ ...s, durationSeconds: s.durationSeconds * 1.5 })));
    const en = buildLanguageTimeline("en", [1, 2], segs);
    const floors = commonSceneFloors([hi, en]);
    const enShared = buildLanguageTimeline("en", [1, 2], segs, floors);
    expect(enShared.totalSeconds).toBeCloseTo(hi.totalSeconds);
  });

  it("times subtitle cues to the real line durations", () => {
    const tl = buildLanguageTimeline("en", [1, 2], segs);
    const cues = buildSubtitleCues(tl.segments);
    expect(cues[0].startSeconds).toBe(tl.segments[0].startSeconds);
    const last = cues.at(-1)!;
    const lastSeg = tl.segments.at(-1)!;
    expect(last.endSeconds).toBeCloseTo(lastSeg.startSeconds + lastSeg.durationSeconds, 2);
    expect(chunkText("word ".repeat(60)).every((c) => c.length <= 84)).toBe(true);
    expect(cuesToAss(cues, { fontName: "Noto Sans Devanagari", width: 1920, height: 1080 })).toContain("Style: Default,Noto Sans Devanagari");
  });
});

describe("ffmpeg command builders", () => {
  it("renders a still with slow motion for the exact number of frames", () => {
    const args = buildSceneClipArgs({ imagePath: "a.png", durationSeconds: 6, width: 1920, height: 1080, fps: 25, motion: "slow-zoom-in", transitionIn: "fade", transitionOut: "cut", outputPath: "o.mp4" });
    expect(args).toContain("150");
    const vf = args[args.indexOf("-vf") + 1];
    expect(vf).toContain("zoompan=z='1+0.10*on/150'");
    expect(vf).toContain("fade=t=in:st=0:d=0.6");
    expect(vf).not.toContain("fade=t=out");
    expect(zoompanFilter("pan-left", 10, 1280, 720, 24)).toContain("s=1280x720:fps=24");
  });

  it("holds the last frame of a provider clip instead of speeding anything up", () => {
    const args = buildSceneClipArgs({ clipPath: "c.mp4", durationSeconds: 9, width: 1280, height: 720, fps: 30, motion: "static", transitionIn: "cut", transitionOut: "cut", outputPath: "o.mp4" });
    expect(args[args.indexOf("-vf") + 1]).toContain("tpad=stop_mode=clone");
  });

  it("places lines with adelay and pads the track to full length", () => {
    const args = buildPlacedTrackArgs([{ path: "a.wav", startSeconds: 1.5 }], 20, "n.wav");
    const graph = args[args.indexOf("-filter_complex") + 1];
    expect(graph).toContain("adelay=1500:all=1");
    expect(graph).toContain("apad=whole_dur=20");
  });

  it("ducks ambience and music under speech", () => {
    const graph = (a: string[]) => a[a.indexOf("-filter_complex") + 1];
    const g = graph(buildMixArgs({ narrationPath: "n.wav", dialoguePath: "d.wav", ambientPath: "a.wav", musicPath: "m.wav", outputPath: "o.wav" }));
    expect(g.match(/sidechaincompress/g)).toHaveLength(2);
    expect(g).toContain("loudnorm=I=-16");
    expect(graph(buildMixArgs({ narrationPath: "n.wav", dialoguePath: "d.wav", outputPath: "o.wav" }))).not.toContain("sidechaincompress");
  });

  it("muxes one AAC track per language with language tags and complex-shaped burned subtitles", () => {
    const args = buildMuxArgs({
      videoPath: "v.mp4",
      audio: [
        { path: "hi.wav", iso6392: "hin", title: "Hindi" },
        { path: "ta.wav", iso6392: "tam", title: "Tamil" },
      ],
      subtitles: [{ path: "hi.srt", iso6392: "hin" }],
      burnIn: { assPath: "hi.ass" },
      outputPath: "o.mp4",
    });
    expect(args).toEqual(expect.arrayContaining(["-metadata:s:a:0", "language=hin", "-metadata:s:a:1", "language=tam", "-c:a", "aac", "-c:s", "mov_text"]));
    expect(args[args.indexOf("-vf") + 1]).toContain("shaping=complex");
  });
});

describe("helpers", () => {
  it("reads exact WAV durations and hashes content stably", () => {
    expect(wavDurationSeconds(buildSilentWav(2.5, 24000))).toBeCloseTo(2.5, 3);
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }));
    expect(contentHash("x")).not.toBe(contentHash("y"));
  });
});
