"""Import every model module so SQLAlchemy's mapper registry can resolve
string-based relationship() references regardless of import order elsewhere
in the app, and so Alembic's autogenerate sees the full metadata."""
from app.core.database import Base  # noqa: F401
from app.models.batch import BatchItem, BatchJob  # noqa: F401
from app.models.lesson import Example, Lesson, LessonAnalysis, Scene, TeachingPlan  # noqa: F401
from app.models.privacy import DeletionEvent, DeletionJob  # noqa: F401
from app.models.settings import ProjectSetting  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.video import QualityReport, RenderJob, VideoAsset  # noqa: F401
from app.models.voice import AudioAsset, VoiceProfile  # noqa: F401

__all__ = [
    "Base",
    "User",
    "Lesson",
    "LessonAnalysis",
    "Example",
    "TeachingPlan",
    "Scene",
    "VoiceProfile",
    "AudioAsset",
    "VideoAsset",
    "RenderJob",
    "QualityReport",
    "BatchJob",
    "BatchItem",
    "ProjectSetting",
    "DeletionEvent",
    "DeletionJob",
]
