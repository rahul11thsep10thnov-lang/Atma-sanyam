import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { LocalAiError } from "../types";

// backend/comfyui-workflows, from src/… (tsx) or dist/src/… (compiled)
export const DEFAULT_WORKFLOW_DIR = [resolve(__dirname, "../../../../comfyui-workflows"), resolve(__dirname, "../../../../../comfyui-workflows")].find((d) => existsSync(d)) ?? resolve(__dirname, "../../../../comfyui-workflows");

/**
 * ComfyUI workflows are stored in API format with "{{name}}" placeholders.
 * A string that is exactly "{{name}}" is replaced by the typed value (number,
 * boolean, string); placeholders inside longer strings are interpolated as
 * text. Unknown placeholders are an error, so a template can never be sent
 * half-filled.
 */
export function fillTemplate(template: unknown, values: Record<string, string | number | boolean>): unknown {
  const missing = new Set<string>();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const whole = /^\{\{(\w+)\}\}$/.exec(v);
      if (whole) {
        if (!(whole[1] in values)) missing.add(whole[1]);
        return values[whole[1]];
      }
      return v.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
        if (!(k in values)) missing.add(k);
        return String(values[k] ?? "");
      });
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => k !== "_meta_template").map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const out = walk(template);
  if (missing.size) throw new LocalAiError(`Workflow template is missing values for: ${[...missing].join(", ")}`, false, "CONFIG");
  return out;
}

export async function loadWorkflow(name: string, dir = process.env.COMFYUI_WORKFLOW_DIR || DEFAULT_WORKFLOW_DIR): Promise<Record<string, unknown>> {
  if (!/^[\w.-]+\.json$/.test(name)) throw new LocalAiError(`Invalid workflow name: ${name}`, false, "CONFIG");
  try {
    return JSON.parse(await readFile(join(dir, name), "utf8")) as Record<string, unknown>;
  } catch (e) {
    throw new LocalAiError(`Cannot load workflow ${name}: ${(e as Error).message}`, false, "CONFIG");
  }
}
