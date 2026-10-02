import { describe, it, expect } from "vitest";
import { extractPdfText, looksScanned } from "./pdf";
import { buildMinimalPdf } from "../__fixtures__/minimalPdf";

describe("extractPdfText", () => {
  it("extracts the text of a real (generated) PDF", async () => {
    const pdf = buildMinimalPdf([
      "STAFF SELECTION COMMISSION",
      "Combined Graduate Level Examination 2027",
      "Total Vacancies: 14582",
      "Closing date: 24-02-2027",
    ]);
    const result = await extractPdfText(pdf);
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("STAFF SELECTION COMMISSION");
    expect(result.text).toContain("Total Vacancies: 14582");
    expect(result.text).toContain("24-02-2027");
    expect(looksScanned(result)).toBe(false);
  });

  it("flags a PDF with (almost) no text layer as scanned", async () => {
    const result = await extractPdfText(buildMinimalPdf(["x"]));
    expect(looksScanned(result)).toBe(true);
  });
});
