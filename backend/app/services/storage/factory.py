from app.core.config import Settings
from app.services.storage.base import StorageService
from app.services.storage.local_storage import LocalStorageService


def get_storage_service(settings: Settings) -> StorageService:
    if settings.storage_backend == "local":
        return LocalStorageService(root=settings.storage_path)
    # S3StorageService / R2StorageService would be added here later without
    # any caller needing to change (docs/ARCHITECTURE.md).
    raise ValueError(f"Unsupported STORAGE_BACKEND '{settings.storage_backend}'")
