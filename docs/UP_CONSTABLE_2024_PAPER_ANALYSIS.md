# UP Police Constable — 25 August 2024, Shift 1: paper analysis

Source: the official UPPRPB question paper (scanned copy supplied by the
admin, 21 scanned pages, questions 1–150). It is stored as **Source
Material** (kind *pyq*, reference only, not approved for generation) and its
text questions are in the question bank as **PYQ → NEEDS_REVIEW**. Nothing
from it is published automatically.

Transcription: `backend/seed/pyq/up-police-constable-2024-08-25-shift1.json`
(150 questions, Hindi, with subject, chapter, topic, difficulty label, the
answer we solved ourselves and a one-line explanation). Load it with:

```bash
cd backend && npm run seed:pyq            # add --dry-run to only validate
```

> The scan carries a candidate's pencil marks (circled options, rough work).
> They are **not** the official key and were ignored; every answer in the
> file was solved independently. Where the print is unclear or the keyed
> answer is debatable the question carries a `note` (Q11, 17, 59, 73, 74,
> 75, 101, 124, 147, 148) — a reviewer should check those first.

## 1. Pattern

| | |
|---|---|
| Questions / time | 150 / 120 minutes |
| Marking | +2 per correct, −0.5 per wrong (negative ¼) |
| Language | Bilingual Hindi–English; the Hindi section is Hindi only |
| Official sections | General Knowledge 38 · General Hindi 37 · Numerical & Mental Ability 38 · Mental Aptitude / IQ / Reasoning 37 |

Order in this shift: reasoning (Q1–19) → numerical (Q20–40) → reasoning and
aptitude (Q41–57) → General Hindi (Q58–94) → numerical / reasoning mix
(Q95–112) → General Knowledge (Q113–150).

## 2. What was asked (by our taxonomy)

| Subject (taxonomy) | Q | Chapters seen (count) |
|---|---|---|
| Reasoning | 47 | series 8, analogy 6, figure-based 6, blood relation 4, coding–decoding 4, verbal reasoning 3, direction 2, word formation 2, Venn 2, puzzle 2, counting figures 2, odd one out 2, statement–conclusion 1, mirror image 1, clock 1, sitting arrangement 1 |
| Numerical ability | 27 | profit–loss 3, percentage 3, mixture 3, LCM–HCF 3, speed–distance 3, average 2, time & work 2, data interpretation 2, partnership 1, SI 1, CI 1, number system 1, ages 1, simplification 1 |
| General Hindi | 37 | gadyansh 5, sahitya & lekhak 4, paryayvachi 3, shabd-yugm 3, anekarthi 2, ras–alankar 2, ling–vachan 2, muhavare 2, tatsam–tadbhav 2, vartani/shuddh vakya 2, upsarg 2, and one each of ek-shabd, karak, sandhi, samas, vachya, viram chinh, kriya, vyakaran |
| General Knowledge (gk + polity + history + science + geography + current affairs + state GK + police/law) | 39 | economy/banking 5, science & technology 4, computer & IT 4, world GK 4, polity 4, history 4, agriculture 2, books & authors 2, science 2, geography 2, current affairs 2, awards 1, law & justice 1, UP GK 1, security forces 1 |

Observations that shape the generation plan:

- **Hindi is grammar-heavy and literature-light**: 32 of 37 questions are
  grammar/vocabulary; literature appears only as award/author facts and one
  doha. A 5-question comprehension passage (gadyansh) is standard.
- **Numerical questions are arithmetic, not algebra**: mixtures, percentages,
  averages, LCM/HCF, speed–time, work, interest, one partnership and one
  data table. Every one is solvable in under a minute with one formula.
- **Reasoning is one-third non-verbal** (figure series, embedded figure,
  mirror image, counting triangles). Text generation cannot cover these;
  the figure engine does (`seed/plans/up-police-constable-nonverbal.json`,
  1,200 questions, see OPERATOR_GUIDE §1e). The remaining two-thirds are
  series, analogies, coding, blood relations and directions.
- **GK is contemporary and economy-leaning**: GDP/NSO/GST/MPC, CRISPR, AI,
  cyber terms (TBT, malware, cyberbullying), Indo-Japan nuclear deal,
  National Maritime Day theme, plus classic polity/history one-liners.
  Only one UP-specific question (Varanasi).

## 3. Difficulty calibration — the "40%" level

We score each question with a weight — **easy 0.2, medium 0.4, hard 0.7** —
and call the mean the *difficulty index*. Labels used: *easy* = one fact or
one step; *medium* = a rule plus a step, or two steps; *hard* = multi-step,
a trap, or a rarely tested fact.

| | Easy | Medium | Hard | Index |
|---|---|---|---|---|
| This paper (as labelled in the file) | 85 | 51 | 14 | **0.32** |
| Target asked for ("difficulty level of 40%") | 30% | 50% | 20% | **0.40** |

So the real paper is a little easier than the requested level: most
questions are single-step. The generation plan therefore uses the
**30 / 50 / 20** mix, which yields an index of exactly 0.40 — slightly
harder than the real paper, as requested — while the PYQ questions keep
their own labels so the admin can see the true level of the exam alongside.

The same mix is stored in the blueprint created by `npm run seed:pyq`
(**UP Police Constable — official pattern (150 Q / 120 min)**: 150 questions,
120 min, +2 / −0.5, 30/50/20, sections GK 20 + current affairs 6 + polity 4
+ history 4 + science 2 + geography 2, Hindi 37, Maths 38, Reasoning 37).

## 4. Answer key (solved independently)

```
  1–10  A B D C B B D C C C      11–20  B B D B A D A A B A
 21–30  A B D B D B A B A D      31–40  C B D C D A A A D D
 41–50  C C A B D C C A D C      51–60  A A A D B D C D B C
 61–70  D C D C B D B D C A      71–80  D A C A C A D A A A
 81–90  B D B A B C A C A A      91–100 C D B D A B B B B A
101–110 B B C C A C D D A B     111–120 A D D C A D C B C D
121–130 A C B C A C C A A B     131–140 D B D A B A C A D D
141–150 D D D A D D D A A B
```

Figure-based questions (not importable as text): 1, 2, 14, 41, 46, 50, 51,
53, 54 — answers above are by visual inspection of the scan.

## 5. The 5,000-question plan

`backend/seed/plans/up-police-constable-5000.json` — 82 jobs, one per
chapter, 5,000 questions, Hinglish, mix 30/50/20:

| Subject | Questions | Weight in the real paper |
|---|---|---|
| Numerical ability | 1,240 | 38 / 150 |
| Reasoning (text-only chapters) | 1,090 | 37 / 150 (minus non-verbal) |
| General Hindi | 1,240 | 37 / 150 |
| GK: gk 710 + polity 150 + history 130 + current affairs 130 + geography 100 + science 90 + UP GK 90 + police/law 30 | 1,430 | 38 / 150 |

Within a subject the counts follow the chapter frequencies in §2 (series,
analogy and coding lead reasoning; percentage and profit–loss lead maths;
muhavare, paryayvachi and sandhi/samas lead Hindi; economy and static GK
lead GK). Queue it with:

```bash
cd backend && npm run plan:queue -- --dry-run   # cost estimate only
cd backend && npm run plan:queue                # queue all 82 jobs
```

Each job goes through the normal pipeline (batches of 20 → generate →
validate → duplicate check → independent AI review → APPROVED /
NEEDS_REVIEW / REJECTED) and every question is labelled **easy / medium /
hard** by the generator and re-checked by the reviewer (`difficulty_appropriate`).
Progress and cost are visible under **Generate Questions**.

**What this does and does not do.** With `MOCK_AI=true` (the default in
development) the plan runs end-to-end at zero cost but produces placeholder
questions for testing the console — they are not exam-quality and should be
rejected in bulk afterwards. Real questions need `MOCK_AI=false` and
`AI_API_KEY` in `backend/.env` (see README §5); at the default models the
dry run prints the estimated cost before anything is queued, and the monthly
budget in Settings caps it. No question is published without an admin.

## 6. Next steps for the exam team

1. Review the 141 PYQ questions (Review Questions → filter *Source: PYQ*),
   starting with the ten flagged in the `note` field; approve the clean
   ones so they can be used as reference material and in PYQ practice sets.
2. Set the AI key, run the plan, then review in priority order: Hindi and GK
   first (facts need a human eye), numerical last (the computation check
   already verifies the arithmetic).
3. Once ≈1,500 questions are published, generate a series of tests from the
   official-pattern blueprint (Mock Tests → Blueprints → Generate tests).
