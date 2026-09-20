import { ScriptGenerator } from "./ScriptGenerator";
import { TemplateScriptGenerator } from "./TemplateScriptGenerator";
import { AnthropicScriptGenerator } from "./AnthropicScriptGenerator";
import { isAnthropicConfigured } from "../../lib/anthropicClient";

export * from "./ScriptGenerator";

export function getScriptGenerator(): ScriptGenerator {
  return isAnthropicConfigured() ? new AnthropicScriptGenerator() : new TemplateScriptGenerator();
}
