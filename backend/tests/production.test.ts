import { describe, expect, it } from "vitest";
import { directScene } from "../src/studio/production/shotDirector";
import { directEpisode } from "../src/studio/production/episodeDirector";
import { analyzeMotion } from "../src/studio/production/motionRequirementAnalyzer";
import { planComposition } from "../src/studio/production/visualCompositionPlanner";
import { detectEnvironment, ENVIRONMENTS } from "../src/studio/production/library/environments";
import { DirectorContext, SceneInput } from "../src/studio/production/types";
import { LLMProvider } from "../src/studio/providers/llm/LLMProvider";

const ctx: DirectorContext = {
  storyId: "story1",
  storyTitle: "Man waits at Jaipur station",
  sensitiveTopics: [],
  locationLabel: "Jaipur, Rajasthan",
  state: "Rajasthan",
  i2vAvailable: false,
  styleKey: "indian-graphic-novel",
  characters: [
    { key: "CHAR_01", displayName: "Ramesh", role: "husband", gender: "MALE", ageGroup: "ADULT", isMinor: false, isOfficial: false, anonymized: false, speaks: false },
    { key: "CHAR_02", displayName: "Anil Kumar", role: "station house officer", gender: "MALE", ageGroup: "ADULT", isMinor: false, isOfficial: true, anonymized: false, speaks: true },
    { key: "CHAR_03", displayName: "a minor boy", role: "son", gender: "MALE", ageGroup: "CHILD", isMinor: true, isOfficial: false, anonymized: true, speaks: false },
  ],
};

const scene = (over: Partial<SceneInput> = {}): SceneInput => ({
  sceneNumber: 2,
  durationSeconds: 12,
  location: "railway station, Jaipur, Rajasthan",
  timeOfDay: "evening",
  characters: ["CHAR_01", "CHAR_03"],
  narratorText: "Ramesh waited on the platform with his luggage. The train was late by two hours.",
  dialogue: [],
  emotionalTone: "neutral",
  cameraDirection: "slow push-in",
  background: "railway station in Jaipur",
  props: [],
  safetyLevel: "SAFE",
  safetyReasons: [],
  transition: "dissolve",
  ...over,
});

describe("ShotDirector", () => {
  it("splits a scene into 1–3 shots whose durations cover the scene, never drawing minors", () => {
    const shots = directScene(scene(), ctx, { isFirst: false, isLast: false });
    expect(shots.length).toBeGreaterThanOrEqual(2);
    expect(shots.reduce((s, x) => s + x.durationSeconds, 0)).toBeCloseTo(12, 0);
    for (const s of shots) expect(s.characterKeys).not.toContain("CHAR_03");
    expect(shots[0].locationCategory).toBe("RAILWAY_PLATFORM");
    expect(shots.every((s) => s.viewerSees.length > 3 && s.emotionalPurpose.length > 3)).toBe(true);
  });

  it("opens with an establishing shot without people", () => {
    const shots = directScene(scene({ sceneNumber: 1 }), ctx, { isFirst: true, isLast: false });
    expect(shots[0].shotType).toBe("ESTABLISHING");
    expect(shots[0].characterKeys).toEqual([]);
  });

  it("replaces restricted scenes with a people-free substitute", () => {
    const shots = directScene(scene({ safetyLevel: "RESTRICTED", safetyReasons: ["dead_body (restricted)"] }), ctx, { isFirst: false, isLast: false });
    for (const s of shots) {
      expect(s.characterKeys).toEqual([]);
      expect(s.locationCategory).toBe("SUBSTITUTE");
      expect(s.substitute?.description).toMatch(/ambulance|hospital/);
      expect(s.motion.selectedRenderer).toBe("engine25d");
    }
  });

  it("gives a verified quote to the speaker in the scene's last shot only", () => {
    const shots = directScene(
      scene({ characters: ["CHAR_02"], narratorText: "Anil Kumar, the station house officer, said:", dialogue: [{ speakerKey: "CHAR_02", text: "We have registered a case.", statementType: "DIRECT_QUOTE" }] }),
      ctx,
      { isFirst: false, isLast: false }
    );
    expect(shots[0].shotType).toBe("MEDIUM");
    expect(shots[0].poses.CHAR_02).toBe("talking");
    expect(shots.filter((s) => s.dialogue.length > 0)).toHaveLength(1);
    expect(shots.at(-1)!.dialogue[0].speakerKey).toBe("CHAR_02");
  });

  it("uses silhouettes for sensitive scenes", () => {
    const shots = directScene(scene({ safetyLevel: "SENSITIVE", safetyReasons: ["violence (sensitive)"] }), ctx, { isFirst: false, isLast: false });
    expect(shots.every((s) => s.silhouettes)).toBe(true);
  });
});

describe("MotionRequirementAnalyzer", () => {
  const base = { hasCharacters: true, safetyLevel: "SAFE" as const, i2vAvailable: true };
  it("keeps calm moments in 2.5D", () => {
    expect(analyzeMotion({ ...base, hasCharacters: false, text: "The court building was quiet." }).decision).toBe("STATIC_2_5D");
    expect(analyzeMotion({ ...base, text: "He waited on the platform holding his phone." }).decision).toBe("CHARACTER_2_5D");
    expect(analyzeMotion({ ...base, hasCharacters: false, text: "Steam rose as the train left the station." }).decision).toBe("ENVIRONMENT_2_5D");
  });
  it("asks for local I2V only for motion 2.5D cannot fake, and explains why", () => {
    const a = analyzeMotion({ ...base, text: "The man fell from the moving train." });
    expect(a.decision).toBe("LOCAL_I2V_REQUIRED");
    expect(a.selectedRenderer).toBe("i2v");
    expect(a.reason).toMatch(/fall/);
    expect(a.confidence).toBeGreaterThan(0.6);
  });
  it("falls back to 2.5D when no cleared I2V model exists, and never animates restricted scenes", () => {
    expect(analyzeMotion({ ...base, i2vAvailable: false, text: "A scuffle broke out." }).selectedRenderer).toBe("engine25d");
    expect(analyzeMotion({ ...base, safetyLevel: "RESTRICTED", text: "He fell from the roof." }).decision).toBe("STATIC_2_5D");
  });
});

describe("environment library", () => {
  it("covers the required Indian location categories", () => {
    const required = ["RAILWAY_STATION", "RAILWAY_PLATFORM", "BUS_STAND", "POLICE_STATION", "POLICE_BARRICADE", "DISTRICT_HOSPITAL", "GOVERNMENT_HOSPITAL", "COURT", "SCHOOL", "COLLEGE", "MARKET", "TEMPLE", "MOSQUE", "GURUDWARA", "CHURCH", "AIRPORT", "HIGHWAY", "FARM", "FACTORY", "OFFICE", "GOVERNMENT_BUILDING", "METRO_STATION", "RIVERBANK", "MOUNTAIN_VILLAGE", "URBAN_STREET", "VILLAGE_ROAD", "RESIDENTIAL_COLONY", "POLICE_HEADQUARTERS", "FIRE_STATION", "TRAIN", "BUS", "AMBULANCE"];
    const have = ENVIRONMENTS.map((e) => e.category as string);
    for (const r of required) expect(have).toContain(r);
  });
  it("detects place from location fields, not narration", () => {
    expect(detectEnvironment("police station, Jaipur", "police station, Jaipur")).toBe("POLICE_STATION");
    expect(detectEnvironment("city street, Jaipur", "city street, Jaipur")).toBe("URBAN_STREET");
  });
});

describe("VisualCompositionPlanner", () => {
  const canvas = { width: 1080, height: 1920, fps: 30, aspectRatio: "9:16" };
  const plan = (s: SceneInput, shotIndex = 0, over = {}) => {
    const shots = directScene(s, ctx, { isFirst: false, isLast: false });
    return planComposition({ shot: shots[shotIndex], scene: s, ctx, canvas, seed: 42, position: { firstShotOfEpisode: false, lastShotOfEpisode: false }, ...over });
  };

  it("builds back-to-front depth layers: background, train, character, props, foreground", () => {
    const p = plan(scene());
    const kinds = p.layers.map((l) => l.kind);
    expect(kinds[0]).toBe("BACKGROUND");
    expect(kinds).toContain("MIDGROUND");
    expect(kinds).toContain("CHARACTER");
    expect(kinds.at(-1)).toBe("FOREGROUND");
    const depths = p.layers.map((l) => l.depth);
    expect(depths[0]).toBe(0);
    expect(depths.at(-1)).toBe(1);
    expect(p.layers[0].placement.cover).toBe(true);
    expect(p.composition.midground[0].name).toMatch(/train/);
    const train = p.layers.find((l) => l.key === "mid_train")!;
    expect(train.motion?.translate).toBeDefined();
    expect(p.environment.particles.map((x) => x.type)).toContain("steam");
    expect(p.lighting.lights.some((l) => l.type === "train" && l.motion)).toBe(true);
  });

  it("uses stable reuse keys so the same place and person resolve to the same assets", () => {
    const a = plan(scene(), 0);
    const b = plan(scene({ sceneNumber: 3 }), 0);
    expect(a.layers.find((l) => l.kind === "BACKGROUND")!.reuseKey).toBe(b.layers.find((l) => l.kind === "BACKGROUND")!.reuseKey);
    const charA = a.layers.find((l) => l.kind === "CHARACTER")!;
    const charB = b.layers.find((l) => l.kind === "CHARACTER")!;
    expect(charA.characterRefKey).toBe(charB.characterRefKey);
  });

  it("lets the director override depth values", () => {
    const p = plan(scene(), 0, { depthOverrides: { midground: 0.3, foreground: 0.9 } });
    expect(p.layers.find((l) => l.key === "mid_train")!.depth).toBeCloseTo(0.3);
    expect(p.layers.at(-1)!.depth).toBeCloseTo(0.9);
  });

  it("frames a close-up big and focused, with a rack focus for inserts", () => {
    const shots = directScene(scene({ characters: [], narratorText: "The complaint and FIR papers were filed.", location: "police station, Jaipur", background: "police station" }), ctx, { isFirst: false, isLast: false });
    const insert = shots.find((s) => s.shotType === "INSERT")!;
    const p = planComposition({ shot: insert, scene: scene(), ctx, canvas, seed: 1, position: { firstShotOfEpisode: false, lastShotOfEpisode: false } });
    expect(p.layers.some((l) => l.kind === "PROP")).toBe(true);
    expect(p.focus.rack).toBeDefined();
  });
});

describe("EpisodeDirector", () => {
  it("validates LLM suggestions and never lets them add people or override safety", async () => {
    const fake: LLMProvider = {
      key: "fake",
      model: "fake",
      isConfigured: () => true,
      completeJson: async <T,>() =>
        ({ synopsis: "A man waits.", scenes: [{ sceneNumber: 1, shots: [{ shotType: "CLOSE_UP", cameraMovement: "whip_pan", viewerSees: "a face", emotionalPurpose: "drama" }] }] }) as T,
    };
    const plan = await directEpisode(ctx, [scene({ sceneNumber: 1, durationSeconds: 5 }), scene({ sceneNumber: 2 })], fake);
    const first = plan.scenes[0].shots[0];
    expect(first.characterKeys).toEqual([]);
    expect(first.shotType).toBe("ESTABLISHING"); // a people shot type was rejected for a shot with no people
    expect(plan.synopsis).toBe("A man waits.");
  });
});
