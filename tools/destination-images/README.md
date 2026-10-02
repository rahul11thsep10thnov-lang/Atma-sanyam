# Trip-Toe destination image pipeline

Turns a list of Indian tourist destinations (50, 500, 1,000+) into one
production-ready aerial-photography package per destination: a FLUX/Leonardo
prompt, the negative prompt, a filename, SEO alt text, a description, a caption,
tags and a quality-control result. Every image is specified as part of one
consistent photographic collection.

The rules come from [`MASTER_PROMPT.md`](MASTER_PROMPT.md). Edit that file to
change the house style. It is sent as the (cached) system prompt on every call.

This folder is self-contained (its own `package.json`, no imports from the app),
so you can copy it into the Trip-Toe repository unchanged.

## How it works

```
list.txt / .csv ──► normalise + dedupe ──► one Claude call per destination ──► QC ──► revise (≤2) ──► records.jsonl
                     (Part 30/31)            (structured JSON package)          (Part 26)               │
                                                                                                         ▼
                                      batches/batch_01_001-050.txt (Part 27 format) · manifest.json · library.csv
```

- **One destination = one call.** Destinations are never combined (Part 28).
- **Fixed text is added by code, not by the model.** The universal realism and colour-science
  suffix (Part 17/12/3) and the negative prompt (Part 18) are attached word for word, so
  they can't drift across 1,000 images. Filenames are built in code (Part 19) and kept unique.
- **Quality control runs in code.** Altitude against the category guideline, the allowed
  camera angles, alt-text format, a 20–40-word description, 5–10 tags, the canonical state
  name, prompt specificity, the model's own Part 26 self-check, and repeated shots. Any
  failure is sent back to the model with the reasons. If it still fails after two revisions,
  the destination is marked **NEEDS REVIEW** instead of PASS.
- **Variety engine (Part 24/25).** Each call sees the 12 most recent shots, with their
  altitude, angle, time of day, sun direction and weather, and is asked to vary them where
  the geography allows. A shot that matches a recent one on category, altitude, angle,
  time and sun direction is rejected.
- **Accuracy first.** The model records what it couldn't verify in `research.uncertainties`
  and keeps those details out of the prompt. Run with `--research` to let it check facts
  with web search.
- **Part 7 guard.** If a prompt mentions cows, tuk-tuks, saffron, flags and similar, a
  warning is raised so a person can confirm the detail belongs there.

## Setup

```bash
cd tools/destination-images
npm install
export ANTHROPIC_API_KEY=sk-ant-...      # or `ant auth login`
```

## Usage

```bash
# 1. Check how your list was understood: numbering, states, duplicates. No API calls.
npm run plan -- my-destinations.txt

# 2. Try a few first and read the output
npm run generate -- my-destinations.txt --limit 5

# 3. Run the rest. The run is resumable: finished destinations are skipped.
npm run generate -- my-destinations.txt --research

# Regenerate only the ones that ended in NEEDS REVIEW
npm run generate -- my-destinations.txt --redo-review

# Rebuild the batch files / manifest after editing records.jsonl by hand
npm run render -- out/my-destinations
```

Options: `--out DIR`, `--limit N`, `--only 001,014`, `--concurrency N` (default 4),
`--effort low|medium|high|xhigh|max` (default high), `--model ID`
(default `claude-opus-5-5`), `--research`, `--redo-review`.

### Input formats

Use one destination per line, in any of these forms. Lines starting with `#` are ignored:

```
Triveni Sangam — Prayagraj — Uttar Pradesh
Pangong Lake — Ladakh
Konark Sun Temple, Puri, Orissa          ← old names are normalised (Odisha)
Hampi | Vijayanagara | Karnataka
Kalimpong                                 ← state and district are worked out by the model
```

You can also use a CSV, TSV or Markdown table with a header row. The columns are
`Name`, `State`, `District` (or `City`) and `Category`, in any order.

Exact duplicates are removed. Places with the same name in different states are kept.
If a same-named pair is missing a state, it is flagged as a possible duplicate.

### Output (`out/<list-name>/`)

| File | Use |
|---|---|
| `batches/batch_NN_FROM-TO.txt` | Part 27 blocks, 50 destinations per batch, ready to paste into FLUX/Leonardo |
| `manifest.json` | For the website: `file`, `alt`, `description`, `caption`, `tags`, `state`, `category`, `qc` |
| `library.csv` | The whole library in one spreadsheet |
| `records.jsonl` | Full record per destination (research notes, QC detail, token usage). This is the source of truth |
| `normalized.json` | How the input list was parsed |
| `failures.json` | Destinations that errored. Re-run the same command to retry them |

See [`examples/sample-output/`](examples/sample-output) for three finished reference
packages: Triveni Sangam, Jaisalmer Fort and Pangong Lake.

## Generating the images with Hugging Face (free tier)

```bash
export HF_TOKEN=hf_...        # free token: https://huggingface.co/settings/tokens
npm run images -- out/my-destinations --limit 5      # try 5 first
npm run images -- out/my-destinations                # the rest; resumable
```

Pictures are saved to `out/<list>/images/<filename>.webp`, and `manifest.json` records each
picture's real width and height. Re-running skips finished images. If the free credits run
out (HTTP 402) or the token is rejected, the run stops cleanly and keeps what it made.

- **Prompt:** Stable Diffusion models only read roughly the first 77 tokens, so the command
  sends a compact prompt built from the same package fields (place, subject, altitude, angle,
  light, weather). Use `--full-prompt` to send the long one instead.
- **Size:** the default 1344×768 is a native SDXL size and close to 16:9. `--upscale` resizes
  to exactly 3840×2160, which adds pixels but no detail. For true 4K, run a dedicated
  upscaler such as Real-ESRGAN.
- **Model:** `--model` (or `HF_MODEL`) picks any Hugging Face text-to-image model, and
  `--provider` picks the inference provider. Which models are free on the serverless tier
  changes, so if the default fails, try another.
- **Not verified live:** this was written against the official `@huggingface/inference`
  client and tested with a fake client. It hasn't run against Hugging Face's servers, so run
  `--limit 1` first.

## Generating the images by hand

- **Leonardo:** paste `IMAGE GENERATION PROMPT` and `NEGATIVE PROMPT`, use a photoreal
  model and a 16:9 output size, then upscale to 3840×2160.
- **FLUX:** FLUX.1 models ignore negative prompts. Use the positive prompt (it already
  says what to avoid) at 16:9. If your FLUX front-end has a negative field, paste the
  negative prompt there as well.
- Save each image under its `FILE NAME` as WebP. `manifest.json` then matches the files
  one to one.

## Cost and scale

The master spec is cached (1-hour TTL), so after the first call each destination mainly
costs its own input and output. Each destination is usually one call, and up to three when
QC sends it back for revision. `--research` adds web-search calls. Token totals are printed
at the end of each run and kept per record in `records.jsonl`. Try `--limit 5` first to
measure your cost per destination before running a list of 1,000.

## Tests

```bash
npm test     # offline: parsing, filenames, QC, rendering, and a mocked API round-trip
```
