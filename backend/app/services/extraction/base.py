from abc import ABC, abstractmethod
from dataclasses import dataclass


class ExtractionQualityError(Exception):
    """Raised when extracted text is too poor to proceed (e.g. a
    scanned/image-only PDF). Callers must surface this to the user clearly
    (build spec section 8) rather than silently continuing with near-empty
    text."""


@dataclass
class ExtractionResult:
    text: str
    page_count: int | None = None
    warnings: list[str] | None = None


class DocumentExtractor(ABC):
    """Common interface so lesson generation is never coupled to a
    particular file format (build spec section 8)."""

    @abstractmethod
    def extract(self, file_path: str) -> ExtractionResult: ...

    @staticmethod
    def _check_quality(text: str, min_chars: int = 40) -> None:
        stripped = text.strip()
        if len(stripped) < min_chars:
            raise ExtractionQualityError(
                "Extracted text is too short or empty. The document may be a "
                "scanned/image-only file that this MVP cannot OCR. Try "
                "exporting it as text or DOCX first."
            )
