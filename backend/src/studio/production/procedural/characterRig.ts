import { PImage } from "../../engine25d/raster";
import { hash01 } from "../../engine25d/math";
import { FaceParams } from "../library/expressions";
import { Painter, Paint, RGBA, hex, rgb, shade, solid } from "./painter";

// ---------------------------------------------------------------------------
// Procedural cut-out character rig.
//
// A rig is a set of body-part images, each with a pivot (its joint) and an
// attachment point on its parent part. The CharacterMotionEngine rotates the
// parts each frame (pose + breathing + sway + walk cycle + gestures) and the
// face features are painted live (blinks, eye direction, mouth, expression),
// so the character is alive without a video model.
//
// The figure is drawn in a 3/4 view facing screen-right; the engine mirrors
// it (flipX) to face left. "Forward" limb angles therefore point to +x.
// Units: u = rig height / 100. Feet at y = 100u, hip joint at y = 52u.
// ---------------------------------------------------------------------------

export type GenderKey = "MALE" | "FEMALE" | "UNKNOWN";
export type AgeKey = "CHILD" | "YOUNG" | "ADULT" | "ELDERLY" | "UNKNOWN";

export type Outfit = "shirt_trousers" | "kurta_pyjama" | "saree" | "salwar_kameez" | "police_uniform" | "doctor_coat" | "formal" | "dhoti_kurta";
export type HairStyle = "short" | "side_part" | "bald_fringe" | "bun" | "braid" | "short_bob";

export interface CharacterLook {
  key: string;
  gender: GenderKey;
  ageGroup: AgeKey;
  outfit: Outfit;
  hair: HairStyle;
  build: "slim" | "average" | "heavy";
  skin: string;
  hairColor: string;
  primary: string; // main garment colour
  secondary: string; // trousers / blouse / dupatta
  accent: string; // border, belt, trim
  spectacles: boolean;
  cap: boolean;
  moustache: boolean;
  bindi: boolean;
}

export interface CharacterHint {
  key: string;
  gender: GenderKey;
  ageGroup: AgeKey;
  role?: string;
  isOfficial?: boolean;
  appearance?: { clothing?: string; hair?: string; build?: string; palette?: string; accessories?: string } | null;
}

const SKINS = ["#c68e65", "#b27b55", "#9c6747", "#d0a07a", "#8b5b3e", "#a87250"];
const COLOR_WORDS: [RegExp, string][] = [
  [/\bnavy\b/i, "#24345e"],
  [/\b(sky ?blue|light blue)\b/i, "#7fa8d6"],
  [/\bblue\b/i, "#3a5f9e"],
  [/\bmaroon\b/i, "#7a2733"],
  [/\bred\b/i, "#b33a32"],
  [/\bpink\b/i, "#d47a96"],
  [/\borange|saffron\b/i, "#d9822b"],
  [/\byellow|mustard\b/i, "#d6aa2f"],
  [/\bolive\b/i, "#6b6b33"],
  [/\bgreen\b/i, "#3f7a4a"],
  [/\bpurple|violet\b/i, "#6a4a8a"],
  [/\bbrown\b/i, "#7a5236"],
  [/\b(grey|gray)\b/i, "#7d8187"],
  [/\bblack\b/i, "#26272b"],
  [/\b(white|cream|off-white)\b/i, "#ece6d8"],
  [/\bkhaki\b/i, "#b59a62"],
  [/\bbeige\b/i, "#cdb995"],
];
const PRIMARY_POOL = ["#3a5f9e", "#7a2733", "#3f7a4a", "#d6aa2f", "#6a4a8a", "#b33a32", "#2f6f7a", "#d47a96", "#7d8187", "#ece6d8"];
const SECONDARY_POOL = ["#2b2d33", "#5a4a3a", "#3a3f4a", "#ece6d8", "#6b6b33", "#24345e"];

function colorsIn(text: string): string[] {
  const out: { i: number; c: string }[] = [];
  for (const [re, c] of COLOR_WORDS) {
    const m = re.exec(text);
    if (m) out.push({ i: m.index, c });
  }
  return out.sort((a, b) => a.i - b.i).map((o) => o.c);
}

function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Resolves a stable visual identity from the story's character data. The same
 * character key always yields the same look (continuity across shots).
 */
export function resolveCharacterLook(h: CharacterHint): CharacterLook {
  const seed = hashKey(h.key);
  const pick = <T,>(arr: T[], salt: number) => arr[Math.floor(hash01(seed, salt) * arr.length) % arr.length];
  const clothing = `${h.appearance?.clothing ?? ""}`.toLowerCase();
  const hairText = `${h.appearance?.hair ?? ""}`.toLowerCase();
  const role = `${h.role ?? ""}`.toLowerCase();
  const female = h.gender === "FEMALE";
  const elderly = h.ageGroup === "ELDERLY";
  const police = /\b(police|constable|inspector|sub-inspector|si|sho|cop|officer)\b/.test(role) || /\b(khaki|uniform)\b/.test(clothing);
  const doctor = /\b(doctor|surgeon|physician)\b/.test(role) || /\b(white coat|lab coat)\b/.test(clothing);

  let outfit: Outfit;
  if (police && (h.isOfficial || /uniform|khaki/.test(clothing))) outfit = "police_uniform";
  else if (doctor) outfit = "doctor_coat";
  else if (/saree|sari/.test(clothing)) outfit = "saree";
  else if (/salwar|kameez|suit|kurti|dupatta/.test(clothing) && female) outfit = "salwar_kameez";
  else if (/dhoti/.test(clothing)) outfit = "dhoti_kurta";
  else if (/kurta/.test(clothing)) outfit = "kurta_pyjama";
  else if (/blazer|formal|suit|safari/.test(clothing) || (h.isOfficial && !female)) outfit = "formal";
  else if (/shirt|t-shirt|trouser|jeans|pant/.test(clothing)) outfit = "shirt_trousers";
  else if (female) outfit = elderly || hash01(seed, 3) < 0.5 ? "saree" : "salwar_kameez";
  else outfit = elderly ? (hash01(seed, 4) < 0.5 ? "kurta_pyjama" : "dhoti_kurta") : hash01(seed, 4) < 0.7 ? "shirt_trousers" : "kurta_pyjama";

  const named = colorsIn(clothing);
  let primary = named[0] ?? pick(PRIMARY_POOL, 5);
  let secondary = named[1] ?? (outfit === "kurta_pyjama" || outfit === "dhoti_kurta" ? "#ece6d8" : pick(SECONDARY_POOL, 6));
  let accent = pick(["#d6aa2f", "#b33a32", "#2f6f7a", "#ece6d8"], 7);
  if (outfit === "police_uniform") {
    primary = "#b59a62";
    secondary = "#a8905a";
    accent = "#4a3322";
  }
  if (outfit === "doctor_coat") {
    primary = "#f1f1ee";
    secondary = named[0] ?? "#3a5f9e";
    accent = "#2b2d33";
  }
  if (outfit === "formal" && !named[0]) {
    primary = pick(["#2b2d33", "#3a3f4a", "#5a4a3a", "#cdb995"], 8);
    secondary = primary;
  }
  if (primary === secondary && outfit !== "formal" && outfit !== "police_uniform") secondary = shadeHex(primary);

  let hair: HairStyle;
  if (/bald/.test(hairText)) hair = "bald_fringe";
  else if (/braid|plait/.test(hairText)) hair = "braid";
  else if (/bob|short/.test(hairText) && female) hair = "short_bob";
  else if (female) hair = /open|loose/.test(hairText) ? "braid" : hash01(seed, 9) < 0.55 ? "bun" : "braid";
  else hair = elderly && hash01(seed, 9) < 0.4 ? "bald_fringe" : hash01(seed, 9) < 0.5 ? "side_part" : "short";

  const grey = elderly || /grey|gray|white hair|silver/.test(hairText);
  const build = /heavy|stout|plump|large/.test(`${h.appearance?.build ?? ""}`) ? "heavy" : /slim|thin|lean/.test(`${h.appearance?.build ?? ""}`) ? "slim" : hash01(seed, 10) < 0.25 ? "slim" : hash01(seed, 10) > 0.85 ? "heavy" : "average";
  const acc = `${h.appearance?.accessories ?? ""} ${clothing}`.toLowerCase();
  return {
    key: h.key,
    gender: h.gender,
    ageGroup: h.ageGroup,
    outfit,
    hair,
    build,
    skin: pick(SKINS, 11),
    hairColor: grey ? (hash01(seed, 12) < 0.5 ? "#c9c7c2" : "#9d9a95") : "#1c1714",
    primary,
    secondary,
    accent,
    spectacles: /spectacles|glasses|specs/.test(acc) || (elderly && hash01(seed, 13) < 0.6),
    cap: outfit === "police_uniform",
    moustache: !female && (/moustache|mustache/.test(acc) || hash01(seed, 14) < (elderly ? 0.7 : 0.45)),
    bindi: female && (outfit === "saree" || hash01(seed, 15) < 0.4) && !/no bindi/.test(acc),
  };
}

function shadeHex(h: string): string {
  const c = rgb(h);
  const k = (c[0] + c[1] + c[2]) / 3 > 0.5 ? 0.6 : 1.6;
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v * k * 255))).toString(16).padStart(2, "0");
  return `#${to(c[0])}${to(c[1])}${to(c[2])}`;
}

// ---------------------------------------------------------------------------
// Rig definition (JSON-serialisable; part images are stored as PNGs)
// ---------------------------------------------------------------------------

export type PartName =
  | "pelvis"
  | "torso"
  | "head"
  | "hairBack"
  | "skirt"
  | "upperArmL"
  | "foreArmL"
  | "upperArmR"
  | "foreArmR"
  | "thighL"
  | "shinL"
  | "thighR"
  | "shinR"
  | "propPhone"
  | "propBag";

export interface RigPartDef {
  name: PartName;
  parent: PartName | null;
  /** File name of the part image inside the rig folder. */
  image: string;
  width: number;
  height: number;
  /** Joint position inside the part image (px). */
  pivot: [number, number];
  /** Where this part's pivot sits in the parent's local frame (px, relative to the parent pivot). */
  attach: [number, number];
  z: number;
  /** Hidden unless a pose asks for it (held props). */
  optional?: boolean;
}

export interface FaceGeometry {
  /** In head-part image pixels. */
  eyeNear: [number, number];
  eyeFar: [number, number];
  eyeRx: number;
  eyeRy: number;
  irisR: number;
  browY: number;
  browLen: number;
  mouth: [number, number];
  mouthW: number;
  skin: string;
  iris: string;
  brow: string;
  lip: string;
  ink: string;
  moustache: boolean;
}

export interface RigDef {
  version: 1;
  kind: "cutout-rig";
  key: string;
  generator: string;
  width: number;
  height: number;
  /** Root (hip) position inside the rig's reference canvas (px). */
  root: [number, number];
  /** Unit length (px per 1/100 of the figure height). */
  unit: number;
  look: CharacterLook;
  parts: RigPartDef[];
  face: FaceGeometry;
  /** Optional overlay drawn above the live face (fringe, spectacles, cap). */
  headOverlay: string;
}

export interface BuiltRig {
  def: RigDef;
  images: Record<string, PImage>;
}

/** A part canvas whose local frame (in u) has its origin at the part's pivot. */
class Part {
  readonly p: Painter;
  constructor(
    readonly u: number,
    readonly minX: number,
    readonly minY: number,
    maxX: number,
    maxY: number,
  ) {
    this.p = new Painter(Math.max(2, Math.ceil((maxX - minX) * u)), Math.max(2, Math.ceil((maxY - minY) * u)));
  }
  X(x: number) {
    return (x - this.minX) * this.u;
  }
  Yp(y: number) {
    return (y - this.minY) * this.u;
  }
  pts(local: number[]): number[] {
    const out: number[] = [];
    for (let i = 0; i < local.length; i += 2) out.push(this.X(local[i]), this.Yp(local[i + 1]));
    return out;
  }
  poly(local: number[], paint: Paint, opacity = 1) {
    this.p.poly(this.pts(local), paint, opacity);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, paint: Paint, opacity = 1, rot = 0) {
    this.p.ellipse(this.X(cx), this.Yp(cy), rx * this.u, ry * this.u, paint, opacity, rot);
  }
  /** Tapered capsule from (x0,y0) width w0 to (x1,y1) width w1. */
  limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, paint: Paint) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    this.poly([x0 + (nx * w0) / 2, y0 + (ny * w0) / 2, x1 + (nx * w1) / 2, y1 + (ny * w1) / 2, x1 - (nx * w1) / 2, y1 - (ny * w1) / 2, x0 - (nx * w0) / 2, y0 - (ny * w0) / 2], paint);
    this.ellipse(x0, y0, w0 / 2, w0 / 2, paint);
    this.ellipse(x1, y1, w1 / 2, w1 / 2, paint);
  }
  curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: number, paint: Paint, opacity = 1) {
    this.p.curve(this.X(x0), this.Yp(y0), this.X(cx), this.Yp(cy), this.X(x1), this.Yp(y1), width * this.u, paint, opacity);
  }
  pivotPx(): [number, number] {
    return [this.X(0), this.Yp(0)];
  }
  finish(seed: number, inkStrength = 0.7): PImage {
    this.p.ink(inkStrength, 0.1).grain(0.035, seed);
    return this.p.img;
  }
}

const fill = (h: string, k = 1): Paint => ({ kind: "solid", color: shade(rgb(h), k) });
/** Vertical form-shading gradient (light from upper right). */
const formFill = (h: string, x0: number, x1: number, part: Part): Paint => {
  const c = rgb(h);
  return { kind: "linear", x0: part.X(x0), y0: 0, x1: part.X(x1), y1: 0, stops: [[0, shade(c, 0.78)], [0.55, c], [1, shade(c, 1.08)]] as [number, RGBA][] };
};

/**
 * Builds the procedural rig for a character at a given reference height
 * (pixels from the top of the head to the feet).
 */
export function buildCharacterRig(look: CharacterLook, heightPx: number, seed: number): BuiltRig {
  const u = heightPx / 100;
  const female = look.gender === "FEMALE";
  const elderly = look.ageGroup === "ELDERLY";
  const bw = look.build === "heavy" ? 1.15 : look.build === "slim" ? 0.9 : 1;
  const shoulderW = (female ? 17.5 : 21) * bw;
  const waistW = (female ? 13 : 16) * bw * (look.build === "heavy" ? 1.08 : 1);
  const hipW = (female ? 17 : 16) * bw;
  const skin = look.skin;
  const skinShadow = shadeHex2(skin, 0.82);
  const images: Record<string, PImage> = {};
  const parts: RigPartDef[] = [];
  const longTop = look.outfit === "kurta_pyjama" || look.outfit === "salwar_kameez" || look.outfit === "doctor_coat" || look.outfit === "dhoti_kurta";
  const saree = look.outfit === "saree";
  const legColor = saree ? null : look.outfit === "kurta_pyjama" || look.outfit === "dhoti_kurta" ? "#ece6d8" : look.outfit === "salwar_kameez" ? look.secondary : look.outfit === "police_uniform" ? look.secondary : look.outfit === "formal" ? look.secondary : look.outfit === "doctor_coat" ? "#3a3f4a" : look.secondary;
  const topColor = look.outfit === "saree" ? look.secondary : look.primary;
  const shoe = look.outfit === "police_uniform" || look.outfit === "formal" ? "#1b1a1a" : "#5a4030";

  const add = (name: PartName, parent: PartName | null, part: Part, attach: [number, number], z: number, optional = false, ink = 0.7) => {
    images[`${name}.png`] = part.finish(seed + z, ink);
    parts.push({ name, parent, image: `${name}.png`, width: part.p.w, height: part.p.h, pivot: part.pivotPx(), attach: [attach[0] * u, attach[1] * u], z, optional });
  };

  // ---- Pelvis (root at hip centre, global y = 52u) ----
  {
    const pt = new Part(u, -hipW / 2 - 2, -6, hipW / 2 + 2, 8);
    if (saree) {
      pt.poly([-waistW / 2, -5, waistW / 2, -5, hipW / 2, 4, -hipW / 2, 4], fill(look.primary));
    } else {
      const c = legColor ?? look.secondary;
      pt.poly([-waistW / 2, -5, waistW / 2, -5, hipW / 2 + 0.3, 5, -hipW / 2 - 0.3, 5], formFill(c, -hipW / 2, hipW / 2, pt));
      if (look.outfit === "police_uniform" || look.outfit === "formal" || look.outfit === "shirt_trousers") pt.poly([-waistW / 2 - 0.2, -5, waistW / 2 + 0.2, -5, waistW / 2 + 0.2, -3.6, -waistW / 2 - 0.2, -3.6], fill(look.outfit === "police_uniform" ? "#4a3322" : "#2b2522"));
    }
    add("pelvis", null, pt, [0, 0], 30);
  }

  // ---- Legs (thigh: hip → knee 24u, shin: knee → ankle 22u + foot) ----
  const legW = (female ? 6.4 : 6.8) * bw;
  for (const side of ["L", "R"] as const) {
    const far = side === "L";
    const th = new Part(u, -legW / 2 - 1, -2, legW / 2 + 1, 25.5);
    const sh = new Part(u, -legW / 2 - 1, -1.5, 8.5, 24.5);
    if (legColor) {
      th.limb(0, 0, 0, 24, legW, legW * 0.82, formFill(shadeHex2(legColor, far ? 0.86 : 1), -legW / 2, legW / 2, th));
      sh.limb(0, 0, 0, 21.2, legW * 0.82, legW * 0.66, formFill(shadeHex2(legColor, far ? 0.86 : 1), -legW / 2, legW / 2, sh));
      if (look.outfit === "kurta_pyjama" || look.outfit === "salwar_kameez" || look.outfit === "dhoti_kurta") sh.poly([-legW * 0.45, 19.5, legW * 0.45, 19.5, legW * 0.4, 21.5, -legW * 0.4, 21.5], fill(legColor, 0.85)); // gathered hem
    }
    // ankle + foot (sandal or shoe), foot points forward (+x)
    sh.limb(0, 21.6, 0, 22.4, legW * 0.5, legW * 0.5, fill(skin, far ? 0.86 : 1));
    if (shoe === "#1b1a1a") sh.poly([-legW * 0.42, 21.6, legW * 0.3, 21.6, 7.6, 23.2, 7.8, 24.2, -legW * 0.45, 24.2], fill(shoe, far ? 0.85 : 1));
    else {
      sh.poly([-legW * 0.42, 22, 6.6, 22.8, 7.4, 23.8, -legW * 0.45, 23.8], fill(skin, far ? 0.82 : 0.95));
      sh.poly([-legW * 0.5, 23.6, 7.6, 23.6, 7.6, 24.3, -legW * 0.5, 24.3], fill(shoe, far ? 0.85 : 1));
      sh.curve(-legW * 0.3, 22.4, 1.5, 21.6, 3.5, 23, 0.55, fill(shoe));
    }
    add(`thigh${side}`, "pelvis", th, [far ? 3.0 : -3.0, 1.2], far ? 20 : 24);
    add(`shin${side}`, `thigh${side}`, sh, [0, 24], far ? 21 : 25);
  }

  // ---- Skirt-like garments (kurta / kameez / coat hem, saree drape) ----
  if (longTop || saree) {
    const len = saree ? 46.5 : look.outfit === "doctor_coat" ? 30 : look.outfit === "dhoti_kurta" ? 22 : 26;
    const flare = saree ? 1.18 : 1.12;
    const sk = new Part(u, -hipW * flare * 0.7 - 2, -8, hipW * flare * 0.7 + 3, len + 2);
    const col = saree ? look.primary : look.primary;
    const top = -6.5;
    sk.poly([-waistW / 2 - 0.4, top, waistW / 2 + 0.4, top, (hipW / 2) * flare + (saree ? 1.2 : 0.8), len, (-hipW / 2) * flare - (saree ? 0.6 : 0.8), len], formFill(col, -hipW / 2, hipW / 2, sk));
    if (saree) {
      // pleats fanning down the front, contrasting border at the hem
      for (let k = 0; k < 5; k++) sk.curve(1.5 + k * 0.9, 2, 2.4 + k * 1.2, len * 0.6, 2.8 + k * 1.6, len - 0.4, 0.22, fill(look.primary, 0.78));
      sk.poly([(-hipW / 2) * flare - 0.6, len - 2.2, (hipW / 2) * flare + 1.2, len - 2.2, (hipW / 2) * flare + 1.2, len, (-hipW / 2) * flare - 0.6, len], fill(look.accent));
    } else if (look.outfit === "doctor_coat") {
      sk.poly([0.4, top, 1.6, top, 2.2, len, 0.8, len], fill("#d9d9d4")); // coat opening
      sk.curve(-4, 6, -3, 10, -1.5, 9, 0.35, fill("#9a9a96")); // pocket
    } else {
      sk.curve(-hipW / 2 * flare, len - 1.2, 0, len - 0.6, hipW / 2 * flare + 0.6, len - 1.2, 0.35, fill(look.accent, 0.9)); // hem embroidery
      sk.curve(-hipW / 2 * flare + 1.2, len * 0.45, -hipW / 2 * flare + 1.4, len * 0.7, -hipW / 2 * flare + 1.1, len - 0.6, 0.25, fill(col, 0.75)); // side slit shadow
    }
    add("skirt", "pelvis", sk, [0, 0], 32);
  }

  // ---- Torso (pivot at the waist, global y = 50u; shoulders at -31u) ----
  {
    const tt = new Part(u, -shoulderW / 2 - 3, -40, shoulderW / 2 + 3, 4);
    const sY = -30.5;
    const body = [
      -shoulderW / 2 + 1.2, sY - 0.8,
      -1.2, sY - 2.2,
      2.2, sY - 2.2,
      shoulderW / 2 - 1.5, sY - 0.6,
      shoulderW / 2 - 0.4, sY + 3,
      (shoulderW / 2) * 0.86, sY + 12,
      waistW / 2 + 0.6, -2,
      waistW / 2 + 0.4, 2.5,
      -waistW / 2 - 0.4, 2.5,
      -waistW / 2 - 0.6, -2,
      (-shoulderW / 2) * 0.9, sY + 12,
      -shoulderW / 2 - 0.2, sY + 3,
    ];
    // neck (skin) under the collar
    tt.limb(0.6, -35, 0.6, sY - 0.5, 4.6, 5.2, fill(skinShadow));
    tt.poly(body, formFill(topColor, -shoulderW / 2, shoulderW / 2, tt));
    if (female) tt.ellipse(2.6, sY + 9, shoulderW * 0.26, 3.2, fill(topColor, 0.9), 0.55);
    switch (look.outfit) {
      case "shirt_trousers":
      case "police_uniform":
      case "formal": {
        // collar, placket, buttons, pocket
        tt.poly([-1.8, sY - 2.4, 0.6, sY + 2.2, 3, sY - 2.4, 1.9, sY - 0.4, 0.6, sY + 3.4, -0.6, sY - 0.4], fill(topColor, 0.82));
        tt.poly([0.2, sY + 2.2, 1.2, sY + 2.2, 1.2, 1.5, 0.2, 1.5], fill(topColor, 0.9));
        for (let k = 0; k < 5; k++) tt.ellipse(0.7, sY + 5 + k * 5.5, 0.35, 0.35, fill(look.outfit === "police_uniform" ? "#c9a84a" : "#e8e4da"));
        tt.poly([-shoulderW * 0.33, sY + 6, -shoulderW * 0.12, sY + 6, -shoulderW * 0.12, sY + 10.5, -shoulderW * 0.33, sY + 10.5], fill(topColor, 0.9));
        if (look.outfit === "police_uniform") {
          tt.poly([-shoulderW / 2 + 0.6, sY - 0.6, -shoulderW / 2 + 4.8, sY - 1.6, -shoulderW / 2 + 5, sY - 0.4, -shoulderW / 2 + 0.8, sY + 0.8], fill("#8a7445")); // epaulette
          tt.poly([shoulderW * 0.14, sY + 6.2, shoulderW * 0.34, sY + 6.2, shoulderW * 0.34, sY + 7.3, shoulderW * 0.14, sY + 7.3], fill("#1d1d1d")); // blank name plate
        }
        if (look.outfit === "formal") {
          // jacket lapels over a light shirt
          tt.poly([-1.6, sY - 2.2, 2.6, sY - 2.2, 1.4, sY + 12, 0.2, sY + 12], fill("#e9e4d8"));
          tt.poly([-1.6, sY - 2.2, 0.4, sY + 12, -3.6, sY + 4], fill(topColor, 0.75));
          tt.poly([2.6, sY - 2.2, 0.8, sY + 12, 4.4, sY + 4], fill(topColor, 0.75));
        }
        break;
      }
      case "kurta_pyjama":
      case "dhoti_kurta":
      case "salwar_kameez":
        tt.poly([-0.6, sY - 2.2, 2, sY - 2.2, 1.1, sY + 7, 0.3, sY + 7], fill(topColor, 0.8)); // neckline placket
        for (let k = 0; k < 3; k++) tt.ellipse(0.7, sY + 1 + k * 2, 0.28, 0.28, fill(look.accent));
        break;
      case "doctor_coat":
        tt.poly([-1.6, sY - 2.2, 2.6, sY - 2.2, 1.4, sY + 14, 0.2, sY + 14], fill(look.secondary));
        tt.poly([-1.6, sY - 2.2, 0.4, sY + 14, -3.8, sY + 5], fill("#dcdcd8"));
        tt.poly([2.6, sY - 2.2, 0.8, sY + 14, 4.6, sY + 5], fill("#dcdcd8"));
        tt.curve(-2.6, sY - 1.5, -4.5, sY + 8, -1.5, sY + 12, 0.45, fill("#2b2d33")); // stethoscope
        tt.curve(3.4, sY - 1.5, 4.6, sY + 6, 2.2, sY + 10, 0.45, fill("#2b2d33"));
        break;
      case "saree":
        // blouse (secondary) is the base; pallu drapes from the left hip over the right shoulder
        tt.poly([-waistW / 2 - 0.6, -1, -shoulderW * 0.15, sY + 6, shoulderW * 0.15, sY - 1.8, shoulderW / 2 - 0.8, sY - 0.4, shoulderW / 2 - 0.2, sY + 4, waistW / 2 + 0.6, -3, waistW / 2 + 0.4, 2.5, -waistW / 2 - 0.4, 2.5], formFill(look.primary, -shoulderW / 2, shoulderW / 2, tt));
        tt.curve(-waistW / 2 - 0.4, -1.2, -shoulderW * 0.1, sY + 7, shoulderW * 0.16, sY - 1.4, 0.7, fill(look.accent));
        tt.ellipse(-shoulderW * 0.28, sY + 14, 2.2, 1.2, fill(skin, 0.95)); // midriff hint stays modest: small
        break;
    }
    if (look.outfit === "salwar_kameez") {
      // dupatta across both shoulders
      tt.curve(-shoulderW / 2 + 0.5, sY + 0.5, 0.5, sY + 8, shoulderW / 2 - 0.5, sY + 0.5, 2, fill(look.secondary, 1));
    }
    add("torso", "pelvis", tt, [0, -2], 40);
  }

  // ---- Arms (shoulder → elbow 16u, elbow → wrist 13.5u, hand 5u) ----
  const armW = (female ? 4.4 : 5) * bw;
  const longSleeve = look.outfit !== "shirt_trousers" || hash01(seed, 21) < 0.5;
  const sleeveColor = look.outfit === "saree" ? look.secondary : look.outfit === "doctor_coat" ? "#f1f1ee" : topColor;
  for (const side of ["L", "R"] as const) {
    const far = side === "L";
    const k = far ? 0.84 : 1;
    const ua = new Part(u, -armW / 2 - 1, -2, armW / 2 + 1, 18);
    const fa = new Part(u, -armW / 2 - 1.5, -1.5, armW / 2 + 2.5, 20.5);
    ua.limb(0, 0, 0, 16, armW, armW * 0.84, formFill(shadeHex2(sleeveColor, k), -armW / 2, armW / 2, ua));
    if (saree) ua.limb(0, 4.5, 0, 16, armW * 0.82, armW * 0.76, fill(skin, k)); // short blouse sleeve
    if (!longSleeve && look.outfit === "shirt_trousers") ua.limb(0, 8, 0, 16, armW * 0.8, armW * 0.74, fill(skin, k));
    const sleeveToWrist = longSleeve && !saree;
    if (sleeveToWrist) fa.limb(0, 0, 0, 12.6, armW * 0.84, armW * 0.7, formFill(shadeHex2(sleeveColor, k), -armW / 2, armW / 2, fa));
    else fa.limb(0, 0, 0, 13, armW * 0.76, armW * 0.56, fill(skin, k));
    if (sleeveToWrist) fa.limb(0, 12.4, 0, 13.6, armW * 0.56, armW * 0.54, fill(skin, k));
    // hand: palm + thumb, slightly forward
    fa.ellipse(0.4, 16, armW * 0.46, 2.6, fill(skin, k));
    fa.ellipse(1.6, 14.8, armW * 0.18, 1.3, fill(skin, k * 0.92), 1, -30);
    if (look.outfit === "police_uniform" || look.outfit === "formal") fa.limb(0, 12.2, 0, 12.8, armW * 0.74, armW * 0.72, fill(sleeveColor, 0.8));
    if (female && !far) fa.limb(0, 12.6, 0, 13.1, armW * 0.62, armW * 0.62, fill(look.accent)); // bangles
    add(`upperArm${side}`, "torso", ua, [far ? shoulderW / 2 - 3.6 : -shoulderW / 2 + 2.2, -29.5], far ? 10 : 60);
    add(`foreArm${side}`, `upperArm${side}`, fa, [0, 16], far ? 11 : 61);
  }

  // ---- Head (pivot at the neck base, global y ≈ 17.5u) ----
  const headW = 10.2;
  const headH = 13.6;
  const hcx = 0.6;
  const hcy = -9.6;
  const head = new Part(u, -headW / 2 - 3, -headH - 5, headW / 2 + 3, 1.5);
  const overlay = new Part(u, -headW / 2 - 3, -headH - 5, headW / 2 + 3, 1.5);
  {
    const jaw: number[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI; // upper half (skull)
      jaw.push(hcx + Math.cos(a) * headW * 0.5, hcy - 1 + Math.sin(a) * headH * 0.52);
    }
    // jaw line down to a slightly forward chin (3/4 view)
    jaw.push(hcx + headW * 0.5, hcy + 1.2, hcx + headW * 0.42, hcy + 4, hcx + headW * 0.18, hcy + 6.4, hcx - 0.4, hcy + 6.6, hcx - headW * 0.3, hcy + 5.2, hcx - headW * 0.47, hcy + 2);
    head.poly(jaw, { kind: "linear", x0: head.X(hcx - headW / 2), y0: 0, x1: head.X(hcx + headW / 2), y1: 0, stops: [[0, rgb(skinShadow)], [0.5, rgb(skin)], [1, shade(rgb(skin), 1.05)]] });
    // ear (back side of the head in 3/4 view)
    head.ellipse(hcx - headW * 0.43, hcy - 0.5, 1.1, 1.8, fill(skin, 0.88));
    // nose (pointing to +x)
    head.poly([hcx + 1.9, hcy - 2.2, hcx + 3.1, hcy + 1.3, hcx + 1.8, hcy + 1.6], fill(skinShadow), 0.85);
    head.curve(hcx + 1.4, hcy + 1.7, hcx + 2.2, hcy + 2.1, hcx + 3, hcy + 1.4, 0.28, fill(shadeHex2(skin, 0.55)));
    // cheek warmth
    head.ellipse(hcx + 2.6, hcy + 2.2, 1.6, 1.0, solid(0.85, 0.45, 0.4, 0.12));
    if (elderly) {
      head.curve(hcx + 2.6, hcy + 2.6, hcx + 3.4, hcy + 3.8, hcx + 3.1, hcy + 4.6, 0.18, fill(shadeHex2(skin, 0.7)), 0.6);
      head.curve(hcx - 1.2, hcy + 2.8, hcx - 0.8, hcy + 4, hcx - 1.4, hcy + 4.8, 0.18, fill(shadeHex2(skin, 0.7)), 0.5);
    }
    if (look.bindi) head.ellipse(hcx + 1.1, hcy - 4.4, 0.42, 0.42, fill("#b0262a"));
    // hair cap (behind the hairline) — style dependent
    const hc = look.hairColor;
    const capTop = hcy - headH * 0.55;
    if (look.hair === "bald_fringe") {
      head.poly([hcx - headW * 0.52, hcy - 2.2, hcx - headW * 0.5, hcy - 5.5, hcx - headW * 0.28, hcy - 6.6, hcx - headW * 0.1, hcy - 4.2, hcx - headW * 0.32, hcy - 0.4], fill(hc));
    } else {
      const hairline = hcy - (female ? 4.8 : 5.4);
      head.poly(
        [
          hcx - headW * 0.56, hcy + (female ? 1.5 : -0.5),
          hcx - headW * 0.6, hcy - 5,
          hcx - headW * 0.4, capTop + 0.4,
          hcx, capTop - 0.6,
          hcx + headW * 0.36, capTop + 0.2,
          hcx + headW * 0.54, hairline + 0.4,
          hcx + headW * 0.2, hairline - 0.6,
          hcx - headW * 0.3, hairline + 0.4,
          hcx - headW * 0.42, hcy - 0.5,
        ],
        fill(hc),
      );
      // fringe / parting on the overlay so it sits above the eyebrows
      if (look.hair === "side_part") overlay.poly([hcx - headW * 0.1, capTop + 0.2, hcx + headW * 0.56, hairline - 0.2, hcx + headW * 0.5, hairline + 1, hcx + headW * 0.1, hairline - 0.2], fill(hc));
      else if (look.hair === "short") overlay.poly([hcx - headW * 0.2, capTop + 0.6, hcx + headW * 0.5, hairline - 0.4, hcx + headW * 0.46, hairline + 0.7, hcx - headW * 0.1, hairline + 0.2], fill(hc));
      else head.curve(hcx + headW * 0.05, capTop + 0.2, hcx + headW * 0.08, hairline - 1.4, hcx + headW * 0.12, hairline - 0.4, 0.22, fill(hc, 1.8), 0.7); // parting
      for (let s = 0; s < 4; s++) head.curve(hcx - headW * (0.35 - s * 0.12), capTop + 1, hcx - headW * (0.3 - s * 0.1), hcy - 5.5, hcx - headW * (0.44 - s * 0.08), hcy - 2.5, 0.16, fill(hc, 1.5), 0.5);
    }
    if (look.moustache) head.curve(hcx + 0.6, hcy + 3.2, hcx + 1.9, hcy + 2.6, hcx + 3.2, hcy + 3.3, 0.75, fill(look.hairColor));
    if (look.spectacles) {
      overlay.ellipse(hcx - 1.2, hcy - 2.2, 1.8, 1.3, solid(0.7, 0.8, 0.9, 0.12));
      overlay.ellipse(hcx + 2.6, hcy - 2.2, 1.5, 1.2, solid(0.7, 0.8, 0.9, 0.12));
      overlay.curve(hcx - 3, hcy - 2.4, hcx - 1.2, hcy - 3.8, hcx + 0.6, hcy - 2.4, 0.22, fill("#2b2420"));
      overlay.curve(hcx - 3, hcy - 2.0, hcx - 1.2, hcy - 0.6, hcx + 0.6, hcy - 2.0, 0.22, fill("#2b2420"));
      overlay.curve(hcx + 1.1, hcy - 2.4, hcx + 2.6, hcy - 3.6, hcx + 4.1, hcy - 2.4, 0.22, fill("#2b2420"));
      overlay.curve(hcx + 1.1, hcy - 2.0, hcx + 2.6, hcy - 0.8, hcx + 4.1, hcy - 2.0, 0.22, fill("#2b2420"));
      overlay.curve(hcx - 3, hcy - 2.3, hcx - 4.2, hcy - 2.2, hcx - 4.8, hcy - 1.6, 0.2, fill("#2b2420"));
    }
    if (look.cap) {
      // generic police peaked cap: no insignia
      overlay.poly([hcx - headW * 0.58, capTop + 2.6, hcx - headW * 0.5, capTop - 0.8, hcx + headW * 0.3, capTop - 1.4, hcx + headW * 0.6, capTop + 1.4, hcx + headW * 0.62, capTop + 2.8], fill("#a08752"));
      overlay.poly([hcx - headW * 0.58, capTop + 2.4, hcx + headW * 0.62, capTop + 2.4, hcx + headW * 0.62, capTop + 3.6, hcx - headW * 0.58, capTop + 3.6], fill("#3b2c1d"));
      overlay.poly([hcx + headW * 0.3, capTop + 3.4, hcx + headW * 0.92, capTop + 3.8, hcx + headW * 0.6, capTop + 4.6], fill("#1d1813"));
    }
  }
  const faceGeom: FaceGeometry = {
    eyeNear: [head.X(hcx - 1.2), head.Yp(hcy - 2.2)],
    eyeFar: [head.X(hcx + 2.6), head.Yp(hcy - 2.2)],
    eyeRx: 1.15 * u,
    eyeRy: 0.72 * u,
    irisR: 0.55 * u,
    browY: head.Yp(hcy - 3.8),
    browLen: 2.3 * u,
    mouth: [head.X(hcx + 1.6), head.Yp(hcy + 4.0)],
    mouthW: 2.6 * u,
    skin,
    iris: "#2a1a12",
    brow: look.hairColor === "#1c1714" ? "#1c1714" : "#6d6a66",
    lip: female ? "#9a4848" : shadeHex2(skin, 0.68),
    ink: "#17120f",
    moustache: look.moustache,
  };
  // The overlay must share the head's canvas exactly; finish both the same way.
  add("head", "torso", head, [0.6, -31.9], 50, false, 0.6);
  images["head_overlay.png"] = overlay.finish(seed + 99, 0.5);

  // ---- Hair behind the head (bun / braid / bob), sways with hairMotion ----
  if (look.hair === "bun" || look.hair === "braid" || look.hair === "short_bob") {
    const hb = new Part(u, -5, -3, 5, look.hair === "braid" ? 26 : 8);
    if (look.hair === "bun") hb.ellipse(-0.8, 0.4, 2.6, 2.3, fill(look.hairColor));
    if (look.hair === "short_bob") hb.poly([-4.4, -2, 3.4, -2, 3.8, 6.5, -4.6, 6], fill(look.hairColor));
    if (look.hair === "braid") {
      for (let k = 0; k < 9; k++) hb.ellipse(-0.6 + (k % 2 ? 0.35 : -0.35), 1 + k * 2.5, 1.5 - k * 0.06, 1.5, fill(look.hairColor, k % 2 ? 0.85 : 1));
      hb.ellipse(-0.6, 24, 0.8, 0.9, fill(look.accent));
    }
    // attaches at the back of the skull, in the head's local frame
    add("hairBack", "head", hb, [hcx - headW * 0.42, hcy - (look.hair === "bun" ? 4.5 : 3)], 5);
  }

  // ---- Held props (shown only when the pose holds them) ----
  {
    const ph = new Part(u, -2.2, -4, 2.2, 1.5);
    ph.poly([-1.5, -3.6, 1.5, -3.6, 1.5, 1.2, -1.5, 1.2], fill("#1d1f24"));
    ph.poly([-1.2, -3.2, 1.2, -3.2, 1.2, 0.8, -1.2, 0.8], fill("#2e3a4a"));
    add("propPhone", "foreArmR", ph, [0.8, 15.5], 62, true);
    const bg = new Part(u, -6, -1, 6, 15);
    bg.curve(-3.2, 4, 0, -1.5, 3.2, 4, 0.7, fill("#4a3a2a"));
    bg.poly([-5, 4, 5, 4, 5.4, 14, -5.4, 14], fill(look.gender === "FEMALE" ? "#8a4a3a" : "#5a4a38"));
    bg.poly([-5, 4, 5, 4, 5, 6.5, -5, 6.5], fill("#3a2c20"));
    add("propBag", "foreArmR", bg, [0.4, 16], 62, true);
  }

  const width = Math.round(heightPx * 0.42);
  const def: RigDef = {
    version: 1,
    kind: "cutout-rig",
    key: look.key,
    generator: "atma-procedural-v1",
    width,
    height: Math.round(heightPx),
    root: [width / 2, 52 * u],
    unit: u,
    look,
    parts: parts.sort((a, b) => a.z - b.z),
    face: faceGeom,
    headOverlay: "head_overlay.png",
  };
  return { def, images };
}

function shadeHex2(h: string, k: number): string {
  const c = rgb(h);
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v * k * 255))).toString(16).padStart(2, "0");
  return `#${to(c[0])}${to(c[1])}${to(c[2])}`;
}

// ---------------------------------------------------------------------------
// Live face features
// ---------------------------------------------------------------------------

export interface FaceState {
  params: FaceParams;
  /** 0 open … 1 closed. */
  blink: number;
  /** Pupil offset in -1..1 (x right, y down). */
  eye: [number, number];
  /** Extra mouth opening from speech, 0..1. */
  speech: number;
  /** Head turn -1 (away/left) … 1 (towards facing side); shifts features. */
  turn: number;
}

/**
 * Paints eyes, brows, mouth and tears for a face state on top of a copy of the
 * head image, then the overlay (fringe, spectacles, cap). Callers cache the
 * result by a quantised state key, since faces change slowly.
 */
export function paintFace(base: PImage, overlay: PImage | null, g: FaceGeometry, s: FaceState): PImage {
  const p = new Painter(base.width, base.height);
  p.img.data.set(base.data);
  const ink = hex(g.ink);
  const shift = s.turn * g.eyeRx * 0.9;
  const open = Math.max(0.05, s.params.eyeOpen * (1 - s.blink));
  for (const [i, e] of [g.eyeNear, g.eyeFar].entries()) {
    const sx = i === 0 ? 1 : 0.86; // far eye foreshortened
    const cx = e[0] + shift * (i === 0 ? 0.8 : 1.2);
    const cy = e[1];
    const rx = g.eyeRx * sx;
    const ry = g.eyeRy * open;
    if (open > 0.12) {
      p.ellipse(cx, cy, rx, ry, hex("#f4efe6"));
      const ix = cx + s.eye[0] * rx * 0.45;
      const iy = cy + s.eye[1] * ry * 0.35;
      p.ellipse(ix, iy, g.irisR * sx, Math.min(g.irisR, ry * 1.05), hex(g.iris));
      p.ellipse(ix + g.irisR * 0.3, iy - g.irisR * 0.3, g.irisR * 0.22, g.irisR * 0.22, solid(1, 1, 1, 0.85));
    }
    // upper lid line (thick graphic-novel stroke), lower lid hint
    p.curve(cx - rx * 1.05, cy, cx, cy - ry * 1.25 - 0.5, cx + rx * 1.05, cy - ry * 0.1, Math.max(1, g.eyeRx * 0.22), ink);
    if (open > 0.12) p.curve(cx - rx * 0.8, cy + ry * 0.55, cx, cy + ry * 1.15, cx + rx * 0.9, cy + ry * 0.4, Math.max(0.6, g.eyeRx * 0.07), ink, 0.45);
    // brows: tilt > 0 pulls the inner end (towards the nose, +x for the near eye) down
    const inner = i === 0 ? 1 : -1;
    const by = g.browY - s.params.browRaise * g.eyeRy * 1.1;
    const bl = g.browLen * sx * 0.5;
    const tilt = s.params.browTilt * g.eyeRy * 0.9;
    const x0 = cx - bl;
    const x1 = cx + bl;
    const y0 = by + (inner === -1 ? tilt : -tilt * 0.3);
    const y1 = by + (inner === 1 ? tilt : -tilt * 0.3);
    p.curve(x0, y0, cx, by - g.eyeRy * 0.35, x1, y1, Math.max(1, g.eyeRx * 0.3), hex(g.brow));
    if (s.params.tears) p.curve(cx, cy + ry + 1, cx + 1, cy + g.eyeRy * 2.4, cx - 0.5, cy + g.eyeRy * 3.4, Math.max(1, g.eyeRx * 0.12), solid(0.7, 0.85, 1, 0.65));
  }
  // mouth
  const mx = g.mouth[0] + shift * 0.7;
  const my = g.mouth[1];
  const hw = g.mouthW / 2;
  const curve = s.params.mouthCurve * g.mouthW * 0.18;
  const openAmt = Math.min(1, s.params.mouthOpen + s.speech);
  if (openAmt > 0.06) {
    const oh = g.mouthW * 0.32 * openAmt;
    p.poly(
      [mx - hw * 0.85, my - curve * 0.6, mx, my + curve * 0.5 - oh * 0.25, mx + hw * 0.85, my - curve * 0.6, mx + hw * 0.4, my + oh * 0.8 + curve * 0.3, mx - hw * 0.4, my + oh * 0.8 + curve * 0.3],
      hex("#3a1716"),
    );
    if (openAmt > 0.3) p.ellipse(mx, my + oh * 0.05, hw * 0.45, oh * 0.18, hex("#e9e2d6"), 0.8); // teeth
  }
  p.curve(mx - hw, my - curve, mx, my + curve, mx + hw, my - curve, Math.max(1, g.mouthW * 0.07), hex(g.lip));
  if (s.params.mouthCurve > 0.4) p.curve(mx + hw * 0.9, my - curve - 1, mx + hw * 1.1, my - curve * 0.6, mx + hw * 1.05, my - curve * 0.2, Math.max(0.6, g.mouthW * 0.04), ink, 0.5);
  if (overlay) compositeOver(p.img, overlay);
  return p.img;
}

function compositeOver(dst: PImage, src: PImage) {
  const d = dst.data;
  const s = src.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = s[i + 3];
    if (a <= 0) continue;
    const inv = 1 - a;
    d[i] = s[i] + d[i] * inv;
    d[i + 1] = s[i + 1] + d[i + 1] * inv;
    d[i + 2] = s[i + 2] + d[i + 2] * inv;
    d[i + 3] = a + d[i + 3] * inv;
  }
}

