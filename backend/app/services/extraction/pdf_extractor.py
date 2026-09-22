from pypdf import PdfReader

from app.services.extraction.base import DocumentExtractor, ExtractionResult


class PdfExtractor(DocumentExtractor):
    def extract(self, file_path: str) -> ExtractionResult:
        reader = PdfReader(file_path)
        pages_text = [page.extract_text() or "" for page in reader.pages]
        text = "\n\n".join(pages_text)
        warnings = []
        if reader.is_encrypted:
            warnings.append("PDF was encrypted; attempted default decryption.")
        # A page-count-aware quality bar: a multi-page PDF that yields almost
        # no text per page is very likely scanned/image-only.
        min_chars = max(40, 20 * len(pages_text))
        self._check_quality(text, min_chars=min_chars)
        return ExtractionResult(text=text, page_count=len(pages_text), warnings=warnings)
