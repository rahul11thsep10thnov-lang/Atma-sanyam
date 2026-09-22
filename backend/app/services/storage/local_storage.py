import os
import shutil
from pathlib import Path

from app.services.storage.base import AssetMetadata, StorageService

_CATEGORIES = {"uploads", "audio", "video", "thumbnails", "tmp"}


class LocalStorageService(StorageService):
    def __init__(self, root: str) -> None:
        self._root = Path(root)
        for category in _CATEGORIES:
            (self._root / category).mkdir(parents=True, exist_ok=True)

    def build_path(self, category: str, filename: str) -> str:
        if category not in _CATEGORIES:
            raise ValueError(f"Unknown storage category '{category}'. Expected one of {_CATEGORIES}")
        return str(self._root / category / filename)

    def upload(self, local_path: str, dest_path: str) -> str:
        dest = Path(dest_path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if os.path.abspath(local_path) != os.path.abspath(dest_path):
            shutil.copyfile(local_path, dest_path)
        return str(dest)

    def download(self, path: str) -> bytes:
        with open(path, "rb") as f:
            return f.read()

    def exists(self, path: str) -> bool:
        return Path(path).is_file()

    def delete(self, path: str) -> bool:
        p = Path(path)
        if p.is_file():
            p.unlink()
            return True
        return False

    def list(self, category: str) -> list[str]:
        category_dir = self._root / category
        if not category_dir.is_dir():
            return []
        return [str(p) for p in category_dir.rglob("*") if p.is_file()]

    def get_metadata(self, path: str) -> AssetMetadata:
        p = Path(path)
        if not p.is_file():
            return AssetMetadata(path=path, size_bytes=0, exists=False)
        return AssetMetadata(path=path, size_bytes=p.stat().st_size, exists=True)

    def total_usage_bytes(self) -> dict[str, int]:
        """Storage breakdown by category, used by the privacy dashboard."""
        return {
            category: sum(Path(p).stat().st_size for p in self.list(category))
            for category in _CATEGORIES
        }
