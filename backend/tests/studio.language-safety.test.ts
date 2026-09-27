import { describe, expect, it } from "vitest";
import { lintRegister } from "../src/studio/language/registerLint";
import { checkNumberParity, normalizeDigits } from "../src/studio/language/factConsistency";
import { estimateSpeechSeconds, STUDIO_LANGUAGE_CODES } from "../src/studio/language/languageProfiles";
import { classifyScene, detectSensitiveTopics } from "../src/studio/safety/sceneSafety";
import { pickSubstitute } from "../src/studio/safety/safeVisualLibrary";
import { checkDialogue, findUnsupportedNumbers, isQuoteInArticle } from "../src/studio/safety/factCheck";

const scene = (narratorText: string) => ({ narratorText, dialogue: [], background: "home interior", props: [], animationRequirements: "" });

describe("language layer", () => {
  it("supports the 12 required languages", () => {
    expect(STUDIO_LANGUAGE_CODES.sort()).toEqual(["as", "bn", "en", "gu", "hi", "kn", "ml", "mr", "or", "pa", "ta", "te"]);
  });

  it("uses slower word rates for agglutinative languages", () => {
    const text = "one two three four five six seven eight nine ten";
    expect(estimateSpeechSeconds(text, "ml")).toBeGreaterThan(estimateSpeechSeconds(text, "en"));
  });

  it("flags slang, abuse and sensational language", () => {
    expect(lintRegister("The cops gonna check it.", "en").map((f) => f.rule)).toContain("SLANG_OR_COLLOQUIAL");
    expect(lintRegister("A shocking case!", "en").map((f) => f.rule)).toEqual(expect.arrayContaining(["SENSATIONAL_LANGUAGE", "EXCLAMATION"]));
    const hindi = lintRegister("यह सनसनीखेज मामला है, साला।", "hi");
    expect(hindi.find((f) => f.rule === "ABUSIVE_LANGUAGE")?.severity).toBe("BLOCKING");
    expect(hindi.some((f) => f.rule === "SENSATIONAL_LANGUAGE")).toBe(true);
    expect(lintRegister("Police registered a case on Monday.", "en")).toEqual([]);
  });

  it("normalises Indic digits and checks number parity across languages", () => {
    expect(normalizeDigits("२०१५ ৫ ௩ ૭")).toBe("2015 5 3 7");
    expect(checkNumberParity("Married in 2015, Rs 5 lakh demanded.", "२०१५ में शादी, 5 लाख रुपये मांगे।", 1)).toEqual([]);
    const flags = checkNumberParity("Married in 2015.", "2016 में शादी।", 2);
    expect(flags.map((f) => f.rule)).toEqual(["NUMBER_MISSING_IN_TRANSLATION", "NUMBER_ADDED_IN_TRANSLATION"]);
  });
});

describe("safety layer", () => {
  it("classifies scenes SAFE / SENSITIVE / RESTRICTED", () => {
    expect(classifyScene(scene("The family met at the village panchayat.")).level).toBe("SAFE");
    expect(classifyScene(scene("Police said he was arrested on Monday.")).level).toBe("SENSITIVE");
    const r = classifyScene(scene("Police said the woman died by suicide at her home."));
    expect(r.level).toBe("RESTRICTED");
    expect(r.topics).toContain("suicide");
  });

  it("never uses the ceiling-fan substitute in a suicide story", () => {
    for (let n = 0; n < 10; n++) expect(pickSubstitute(["violence"], n, ["suicide"]).id).not.toBe("ceiling-fan");
    expect(pickSubstitute(["dead_body"], 0).description).toContain("ambulance");
  });

  it("detects story-level sensitivity", () => {
    expect(detectSensitiveTopics("A property dispute between brothers reached the civil court.").isSensitive).toBe(false);
    expect(detectSensitiveTopics("She alleged dowry harassment.").isSensitive).toBe(true);
  });

  it("rejects fabricated quotes and reconstructed quotes for named real people", () => {
    const article = 'The SHO said, "We have registered a case."';
    const chars = [
      { key: "CHAR_01", isRealPerson: true, anonymized: false },
      { key: "CHAR_02", isRealPerson: true, anonymized: true },
    ];
    expect(isQuoteInArticle("We have registered a case", article)).toBe(true);
    expect(checkDialogue([{ speakerKey: "CHAR_01", text: "We have registered a case.", statementType: "DIRECT_QUOTE" }], article, chars, false)).toEqual([]);
    expect(checkDialogue([{ speakerKey: "CHAR_01", text: "We will arrest him today.", statementType: "DIRECT_QUOTE" }], article, chars, false)[0].rule).toBe("FABRICATED_QUOTE");
    expect(checkDialogue([{ speakerKey: "CHAR_01", text: "Hello.", statementType: "RECONSTRUCTED_DIALOGUE" }], article, chars, true)[0].rule).toBe("RECONSTRUCTED_QUOTE_FOR_NAMED_PERSON");
    expect(checkDialogue([{ speakerKey: "CHAR_02", text: "Hello.", statementType: "RECONSTRUCTED_DIALOGUE" }], article, chars, true)).toEqual([]);
    expect(checkDialogue([{ speakerKey: "CHAR_02", text: "Hello.", statementType: "RECONSTRUCTED_DIALOGUE" }], article, chars, false)[0].rule).toBe("RECONSTRUCTION_NOT_ALLOWED");
  });

  it("finds numbers that are not in the article", () => {
    expect(findUnsupportedNumbers("She was 34 and paid Rs 6 lakh.", "A 34-year-old paid Rs 5 lakh.")).toEqual(["6"]);
  });
});
