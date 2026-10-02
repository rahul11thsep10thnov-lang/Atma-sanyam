// One Claude call (plus QC revisions) per destination — Part 28: never
// combine destinations into one prompt.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { PackageSchema } from './schema.mjs';
import { SYSTEM_PROMPT, destinationMessage, revisionMessage } from './prompt.mjs';
import { checkPackage } from './qc.mjs';
import { buildFilename } from './slug.mjs';
import { fullPrompt } from './render.mjs';
import { NEGATIVE_PROMPT } from './spec.mjs';

export const DEFAULT_MODEL = 'claude-opus-5-5';
const MAX_REVISIONS = 2;
const MAX_PAUSE_CONTINUATIONS = 4;

export function createClient() {
  return new Anthropic({ maxRetries: 4 });
}

async function callModel(client, opts, messages) {
  const request = {
    model: opts.model,
    max_tokens: 16000,
    // Opus 5.5 always thinks; effort is the depth control (its default is medium).
    output_config: { effort: opts.effort, format: betaZodOutputFormat(PackageSchema) },
    // If a safety classifier declines, the API re-runs on a fallback model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // The master spec is identical for every destination: cache it.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages,
  };
  if (opts.research) {
    request.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }];
  }

  let response = await client.beta.messages.parse(request);
  // Server-side tools (web search) can pause a long turn; resume it as-is.
  for (let i = 0; response.stop_reason === 'pause_turn' && i < MAX_PAUSE_CONTINUATIONS; i++) {
    messages.push({ role: 'assistant', content: response.content });
    response = await client.beta.messages.parse({ ...request, messages });
  }
  return response;
}

const addUsage = (total, u) => {
  for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) {
    total[k] = (total[k] ?? 0) + (u?.[k] ?? 0);
  }
  return total;
};

/**
 * Generates and QC-checks one destination. `ctx.recent` is the collection's
 * recent shots (for variety); `ctx.usedFilenames` keeps filenames unique.
 */
export async function generateDestination(client, dest, ctx, opts) {
  const messages = [{ role: 'user', content: destinationMessage(dest, ctx.recent) }];
  const usage = {};
  let pkg = null;
  let qc = null;
  let servedBy = opts.model;

  for (let attempt = 0; attempt <= MAX_REVISIONS; attempt++) {
    const response = await callModel(client, opts, messages);
    addUsage(usage, response.usage);
    servedBy = response.model;

    if (response.stop_reason === 'refusal') {
      throw new Error(`model declined (${response.stop_details?.category ?? 'no category'}): ${response.stop_details?.explanation ?? ''}`);
    }
    if (response.stop_reason === 'max_tokens') throw new Error('response hit max_tokens');
    if (!response.parsed_output) throw new Error(`no parseable package (stop_reason ${response.stop_reason})`);

    pkg = response.parsed_output;
    const candidateName = buildFilename(
      { state: pkg.state, district: pkg.city_district, name: pkg.name },
      new Set(ctx.usedFilenames),
    );
    qc = checkPackage(pkg, { filename: candidateName, recent: ctx.recent });
    if (qc.pass || attempt === MAX_REVISIONS) break;

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: revisionMessage(qc.errors) });
  }

  // Reserve the name synchronously (no await in between) so concurrent
  // workers can never claim the same filename.
  const filename = buildFilename(
    { state: pkg.state, district: pkg.city_district, name: pkg.name },
    ctx.usedFilenames,
  );
  return {
    id: dest.id,
    key: dest.key,
    input: dest.input,
    status: qc.pass ? 'pass' : 'review',
    filename,
    prompt: fullPrompt(pkg),
    negative_prompt: NEGATIVE_PROMPT,
    package: pkg,
    qc: { errors: qc.errors, warnings: qc.warnings },
    model: servedBy,
    usage,
    generated_at: new Date().toISOString(),
  };
}
