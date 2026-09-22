"""StorageService abstraction (build spec section 12 privacy /
docs/PRIVACY.md "Storage abstraction"). Business logic never touches a raw
filesystem/S3 path directly — everything goes through this interface so a
future S3StorageService/R2StorageService can be swapped in without touching
callers, and so deletion guarantees can be enforced in one place.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AssetMetadata:
    path: str
    size_bytes: int
    exists: bool


class StorageService(ABC):
    @abstractmethod
    def build_path(self, category: str, filename: str) -> str:
        """Returns a fully-qualified path/key for a new asset in the given
        category (uploads|audio|video|thumbnails|tmp), without creating it."""
        ...

    @abstractmethod
    def upload(self, local_path: str, dest_path: str) -> str: ...

    @abstractmethod
    def download(self, path: str) -> bytes: ...

    @abstractmethod
    def exists(self, path: str) -> bool: ...

    @abstractmethod
    def delete(self, path: str) -> bool: ...

    @abstractmethod
    def list(self, category: str) -> list[str]: ...

    @abstractmethod
    def get_metadata(self, path: str) -> AssetMetadata: ...
