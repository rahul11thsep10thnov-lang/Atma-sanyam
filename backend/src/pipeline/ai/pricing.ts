// USD per million tokens (Anthropic first-party API list prices). Used for
// the cost estimate shown before a job starts and for actual cost from the
// token usage the API reports. Override with AI_PRICE_* env vars if your
// contract differs or for models not listed.
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-fable-5-1': { input: 10, output: 50 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  mock: { input: 0, output: 0 },
};

export interface PriceOverride {
  input?: number;
  output?: number;
}

export function priceFor(model: string, override: PriceOverride = {}) {
  const base = PRICES[model] ?? PRICES['claude-opus-5']!;
  return { input: override.input ?? base.input, output: override.output ?? base.output };
}

export function costUsd(model: string, inputTokens: number, outputTokens: number, override: PriceOverride = {}): number {
  const p = priceFor(model, override);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// Rough per-question token budget (includes adaptive thinking), measured to
// err on the high side so estimates are not optimistic.
export const EST_TOKENS = {
  generationPromptPerBatch: 1800,
  generationOutputPerQuestion: 900,
  reviewPromptPerQuestion: 350,
  reviewOutputPerQuestion: 500,
};

export function estimateJobCost(opts: {
  questions: number;
  batchSize: number;
  generationModel: string;
  reviewModel: string;
  mock: boolean;
  override?: PriceOverride;
}): number {
  if (opts.mock) return 0;
  const batches = Math.ceil(opts.questions / opts.batchSize);
  const gen = costUsd(
    opts.generationModel,
    batches * EST_TOKENS.generationPromptPerBatch,
    opts.questions * EST_TOKENS.generationOutputPerQuestion,
    opts.override
  );
  const rev = costUsd(
    opts.reviewModel,
    opts.questions * EST_TOKENS.reviewPromptPerQuestion,
    opts.questions * EST_TOKENS.reviewOutputPerQuestion,
    opts.override
  );
  return Math.round((gen + rev) * 10000) / 10000;
}
