import { describe, expect, it } from "vitest";
import { cleanArticle } from "../src/studio/content/articleCleaner";
import { analyzeArticle } from "../src/studio/content/articleAnalyzer";
import { generateTemplateMasterScript } from "../src/studio/content/masterScriptGenerator";
import { compressToFit } from "../src/studio/content/durationPlanner";
import { extractCharacters } from "../src/studio/content/characterExtractor";
import { SAMPLE_ARTICLE } from "./fixtures";

describe("article cleaning", () => {
  it("strips boilerplate, datelines, HTML and personal contact details", () => {
    const result = cleanArticle(`Jaipur: <p>She said “hello”.</p>\nAlso read: other news\nCall 9876543210 or mail a@b.com\nShe said “hello”.`);
    expect(result.text).toBe('She said "hello".\n\nCall or mail');
    expect(result.removedLines.some((l) => l.startsWith("Also read"))).toBe(true);
    expect(result.redactions.length).toBe(2);
  });
});

describe("article analysis (rule-based)", () => {
  it("extracts facts with verification statuses, characters and location", async () => {
    const a = await analyzeArticle({ title: "Dowry case", text: SAMPLE_ARTICLE });
    const types = (t: string) => a.facts.filter((f) => f.type === t).map((f) => f.value);
    expect(types("PERSON_NAME")).toEqual(expect.arrayContaining(["Sunita Sharma", "Ramesh Sharma", "Anil Kumar"]));
    expect(types("MONEY")).toContain("Rs 5 lakh");
    expect(types("DATE")).toContain("in 2015");
    const quote = a.facts.find((f) => f.type === "QUOTE")!;
    expect(quote.statementType).toBe("DIRECT_QUOTE");
    expect(quote.attributedTo).toContain("Anil Kumar");
    expect(a.facts.find((f) => f.value.startsWith("According to the complaint"))?.verificationStatus).toBe("ALLEGED");
    expect(a.facts.find((f) => f.value.startsWith("Neighbours claimed"))?.verificationStatus).toBe("UNVERIFIED");
    expect(a.location).toMatchObject({ state: "Rajasthan", district: "Jaipur" });
    const sho = a.characters.find((c) => c.realName === "Anil Kumar")!;
    expect(sho).toMatchObject({ isOfficial: true, speaks: true });
    expect(a.characters.find((c) => c.realName === "Ramesh Sharma")?.role).toBe("husband");
    expect(a.characters.some((c) => c.role === "mother-in-law" && c.anonymized)).toBe(true);
    expect(a.characters.some((c) => c.role === "mother")).toBe(false);
    expect(a.sensitiveTopics).toContain("dowry");
  });

  it("never names minors, anywhere in the text", async () => {
    const text = "Police said 12-year-old Riya Verma was found safe at her aunt's house in Pune on Friday. Riya Verma had left home after a quarrel, officers said.";
    const a = await analyzeArticle({ title: "Missing girl found", text });
    expect(a.cleanedText).not.toContain("Riya");
    expect(a.facts.some((f) => f.value.includes("Riya"))).toBe(false);
    const minor = a.characters.find((c) => c.isMinor)!;
    expect(minor.displayName).toMatch(/^a minor/);
    expect(minor.realName).toBeUndefined();
  });

  it("anonymises survivors in sexual-violence stories", () => {
    const text = "Police said Meena Devi, 25, filed a complaint of sexual assault against a neighbour.";
    const characters = extractCharacters(text, [], ["sexual_violence"]);
    const meena = characters.find((c) => c.displayName !== "the neighbour")!;
    expect(meena.displayName).toBe("the woman");
    expect(meena.realName).toBeUndefined();
    expect(meena.anonymized).toBe(true);
  });
});

describe("master script (template)", () => {
  it("builds hedged, sourced scenes with the quote voiced by its speaker, without padding", async () => {
    const analysis = await analyzeArticle({ title: "Dowry case", text: SAMPLE_ARTICLE });
    const { script, warnings } = generateTemplateMasterScript({
      title: "Dowry case",
      analysis,
      targetSeconds: 150,
      maxSeconds: 180,
      minSeconds: 60,
      languageCode: "en",
      sourceName: "Example Times",
      allowDramatizedReconstruction: false,
    });
    expect(script.scenes[0].narratorText).toBe("This report is from Jaipur, Rajasthan.");
    expect(script.scenes.at(-1)!.narratorText).toContain("The allegations have not been proven in court.");
    expect(script.scenes.at(-1)!.narratorText).toContain("Example Times");
    const quoteScene = script.scenes.find((s) => s.dialogue.length > 0)!;
    expect(quoteScene.dialogue[0]).toMatchObject({ statementType: "DIRECT_QUOTE" });
    expect(quoteScene.narratorText).toMatch(/said:$/);
    for (const s of script.scenes) {
      expect(s.durationSeconds).toBeGreaterThanOrEqual(5);
      expect(s.durationSeconds).toBeLessThanOrEqual(20);
    }
    expect(warnings.some((w) => w.includes("Not padded"))).toBe(true);
  });
});

describe("duration planning", () => {
  it("drops non-key sentences first and never drops key facts", () => {
    const long = "word ".repeat(200).trim();
    const result = compressToFit(
      [
        { text: "Key fact sentence about the FIR.", isKey: true, priority: 2 },
        { text: long, isKey: false, priority: 0 },
        { text: "Another key fact with Rs 5 lakh.", isKey: true, priority: 2 },
      ],
      60,
      "en"
    );
    expect(result.kept.map((k) => k.isKey)).toEqual([true, true]);
    expect(result.fits).toBe(true);
  });

  it("reports when key facts alone exceed the limit", () => {
    const result = compressToFit([{ text: "fact ".repeat(900), isKey: true, priority: 2 }], 300, "en");
    expect(result.fits).toBe(false);
    expect(result.kept).toHaveLength(1);
  });
});
