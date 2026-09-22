from app.services.extraction.base import DocumentExtractor, ExtractionResult


class TxtExtractor(DocumentExtractor):
    def extract(self, file_path: str) -> ExtractionResult:
        with open(file_path, encoding="utf-8", errors="replace") as f:
            text = f.read()
        self._check_quality(text)
        return ExtractionResult(text=text, page_count=None, warnings=[])
