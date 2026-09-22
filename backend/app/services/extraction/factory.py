from app.services.extraction.base import DocumentExtractor
from app.services.extraction.docx_extractor import DocxExtractor
from app.services.extraction.pdf_extractor import PdfExtractor
from app.services.extraction.txt_extractor import TxtExtractor

_EXTRACTORS: dict[str, type[DocumentExtractor]] = {
    "txt": TxtExtractor,
    "pdf": PdfExtractor,
    "docx": DocxExtractor,
}


def get_extractor(source_type: str) -> DocumentExtractor:
    cls = _EXTRACTORS.get(source_type.lower())
    if cls is None:
        raise ValueError(f"Unsupported source_type '{source_type}'. Supported: {list(_EXTRACTORS)}")
    return cls()
