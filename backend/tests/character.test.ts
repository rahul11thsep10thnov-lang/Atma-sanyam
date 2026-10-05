import { describe, expect, it } from "vitest";
import { buildCharacterRig, resolveCharacterLook } from "../src/studio/production/procedural/characterRig";
import { rigFromMemory, renderRigFrame } from "../src/studio/engine25d/rigRenderer";
import { evaluateCharacter } from "../src/studio/engine25d/characterMotion";
import { characterMotionSchema } from "../src/studio/engine25d/spec";

const hint = { key: "CHAR_07", gender: "MALE" as const, ageGroup: "ADULT" as const, role: "passenger", appearance: { clothing: "blue shirt and grey trousers" } };

function alphaBounds(img: { width: number; height: number; data: Float32Array }) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (img.data[(y * img.width + x) * 4 + 3] > 0.5) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  return { minY, maxY };
}

describe("character identity and rig", () => {
  it("resolves the same look for the same character key (continuity)", () => {
    expect(resolveCharacterLook(hint)).toEqual(resolveCharacterLook(hint));
    expect(resolveCharacterLook(hint).primary).toBe("#3a5f9e");
    expect(resolveCharacterLook({ ...hint, key: "OFFICER", role: "police inspector", isOfficial: true, appearance: null }).outfit).toBe("police_uniform");
  });

  it("keeps the feet on the ground line in standing, walking and sitting poses", () => {
    const built = buildCharacterRig(resolveCharacterLook(hint), 300, 1);
    const rig = rigFromMemory(built.def, built.images);
    for (const pose of ["standing", "walking", "sitting"] as const) {
      const spec = characterMotionSchema.parse({ pose, walk: pose === "walking" ? {} : undefined });
      const frame = renderRigFrame(rig, evaluateCharacter(spec, 0.7, 5, 9), 1);
      const b = alphaBounds(frame.image);
      expect(Math.abs(b.maxY - frame.anchor[1]), pose).toBeLessThan(4);
    }
    // sitting lowers the head
    const stand = alphaBounds(renderRigFrame(rig, evaluateCharacter(characterMotionSchema.parse({ pose: "standing" }), 0, 5, 9), 1).image);
    const sit = alphaBounds(renderRigFrame(rig, evaluateCharacter(characterMotionSchema.parse({ pose: "sitting" }), 0, 5, 9), 1).image);
    expect(sit.minY).toBeGreaterThan(stand.minY + 40);
  });

  it("is alive: blinks, breathes and is deterministic", () => {
    const spec = characterMotionSchema.parse({ pose: "standing", blinkInterval: 2 });
    const a = evaluateCharacter(spec, 1.234, 5, 4);
    expect(evaluateCharacter(spec, 1.234, 5, 4)).toEqual(a);
    const blinks = Array.from({ length: 150 }, (_, i) => evaluateCharacter(spec, i / 30, 5, 4).face.blink);
    expect(Math.max(...blinks)).toBeGreaterThan(0.8);
    expect(blinks.filter((b) => b > 0.5).length).toBeLessThan(40);
    const breaths = Array.from({ length: 150 }, (_, i) => evaluateCharacter(spec, i / 30, 5, 4).breath);
    expect(Math.max(...breaths) - Math.min(...breaths)).toBeGreaterThan(0.008);
  });

  it("walks with travel and facing from the walk spec", () => {
    const spec = characterMotionSchema.parse({ pose: "walking", walk: { direction: -1, travel: 0.2 } });
    const end = evaluateCharacter(spec, 5, 5, 1);
    expect(end.travelX).toBeCloseTo(-0.2, 5);
    expect(end.facing).toBe(-1);
    const thighs = Array.from({ length: 30 }, (_, i) => evaluateCharacter(spec, i / 30, 5, 1).angles.thighL);
    expect(Math.max(...thighs) - Math.min(...thighs)).toBeGreaterThan(25);
  });

  it("closed eyes change the painted face", () => {
    const built = buildCharacterRig(resolveCharacterLook(hint), 600, 1);
    const rig = rigFromMemory(built.def, built.images);
    const f = evaluateCharacter(characterMotionSchema.parse({ pose: "standing", blinkInterval: 0 }), 0, 5, 1);
    const open = renderRigFrame(rig, f, 1).image.data;
    const closed = renderRigFrame(rig, { ...f, face: { ...f.face, blink: 1 } }, 1).image.data;
    let diff = 0;
    for (let i = 0; i < open.length; i += 4) diff += Math.abs(open[i] - closed[i]);
    expect(diff).toBeGreaterThan(5);
  });
});
