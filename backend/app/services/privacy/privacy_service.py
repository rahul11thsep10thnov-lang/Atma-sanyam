"""PrivacyService: cascade deletion, storage accounting, and data export
(build spec privacy sections 4, 6, 7, 11, 22-23; docs/PRIVACY.md).

Every method here scopes by owner_id and is the implementation behind the
/api/privacy/* routes.
"""
import json
import zipfile
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lesson import Example, Lesson, LessonAnalysis, Scene, TeachingPlan
from app.models.privacy import DeletionEvent
from app.models.video import QualityReport, RenderJob, VideoAsset
from app.models.voice import AudioAsset
from app.schemas.privacy import DeleteLessonManifest
from app.services.storage.base import StorageService
from app.services.storage.local_storage import LocalStorageService


class LessonNotFoundError(Exception):
    pass


class PrivacyService:
    def __init__(self, db: Session, storage: StorageService) -> None:
        self._db = db
        self._storage = storage

    # ---- Deletion manifest (build spec section 4: explain before confirm) ----

    def build_delete_manifest(self, owner_id: str, lesson_id: str) -> DeleteLessonManifest:
        lesson = self._get_owned_lesson(owner_id, lesson_id)
        scenes = self._scenes_for_lesson(lesson_id)
        scene_ids = [s.id for s in scenes]
        audio_count = self._count(AudioAsset, AudioAsset.scene_id.in_(scene_ids)) if scene_ids else 0
        video_assets = self._all(VideoAsset, VideoAsset.lesson_id == lesson_id)
        return DeleteLessonManifest(
            lesson_id=lesson_id,
            source_document=bool(lesson.source_file_asset_id),
            extracted_text=bool(lesson.source_text),
            generated_lesson=bool(lesson.teaching_plans),
            generated_audio_count=audio_count,
            preview_video_count=sum(1 for v in video_assets if v.kind == "preview"),
            final_video_count=sum(1 for v in video_assets if v.kind == "final"),
            thumbnail_count=sum(1 for v in video_assets if v.thumbnail_path),
            temporary_assets=True,
        )

    # ---- Cascade delete (build spec section 11) ----

    def delete_lesson_cascade(self, owner_id: str, lesson_id: str) -> dict[str, int]:
        lesson = self._get_owned_lesson(owner_id, lesson_id)
        scenes = self._scenes_for_lesson(lesson_id)
        scene_ids = [s.id for s in scenes]

        counts = {"audio": 0, "video": 0, "temp": 0}

        if scene_ids:
            for asset in self._all(AudioAsset, AudioAsset.scene_id.in_(scene_ids)):
                self._storage.delete(asset.audio_path)
                self._record_deletion(owner_id, "audio", asset.id, "PROJECT_DELETION")
                self._db.delete(asset)
                counts["audio"] += 1

        for video in self._all(VideoAsset, VideoAsset.lesson_id == lesson_id):
            for path in (video.video_path, video.thumbnail_path, video.subtitle_srt_path, video.subtitle_vtt_path):
                if path:
                    self._storage.delete(path)
            self._record_deletion(owner_id, "video", video.id, "PROJECT_DELETION")
            self._db.delete(video)
            counts["video"] += 1

        if lesson.source_file_asset_id:
            self._storage.delete(lesson.source_file_asset_id)

        if isinstance(self._storage, LocalStorageService):
            tmp_dir = Path(self._storage.build_path("tmp", lesson_id))
            if tmp_dir.is_dir():
                for f in tmp_dir.rglob("*"):
                    if f.is_file():
                        f.unlink()
                        counts["temp"] += 1

        for job in self._all(RenderJob, RenderJob.lesson_id == lesson_id):
            self._db.delete(job)
        for report in self._all(QualityReport, QualityReport.lesson_id == lesson_id):
            self._db.delete(report)

        # ORM cascade="all, delete-orphan" on Lesson removes analyses,
        # examples, teaching_plans (and their scenes) automatically.
        self._db.delete(lesson)
        self._db.commit()
        return counts

    def delete_asset(self, owner_id: str, asset_type: str, asset_id: str) -> bool:
        model = {"audio": AudioAsset, "video": VideoAsset}.get(asset_type)
        if model is None:
            raise ValueError(f"Unknown asset_type '{asset_type}'")
        asset = self._db.execute(
            select(model).where(model.id == asset_id, model.owner_id == owner_id)
        ).scalar_one_or_none()
        if asset is None:
            return False
        if asset_type == "audio":
            self._storage.delete(asset.audio_path)
        else:
            for path in (asset.video_path, asset.thumbnail_path, asset.subtitle_srt_path, asset.subtitle_vtt_path):
                if path:
                    self._storage.delete(path)
        self._record_deletion(owner_id, asset_type, asset_id, "USER_REQUEST")
        self._db.delete(asset)
        self._db.commit()
        return True

    # ---- Storage accounting ----

    def storage_breakdown(self, owner_id: str) -> dict[str, int]:
        if not isinstance(self._storage, LocalStorageService):
            return {"total_bytes": 0, "source_bytes": 0, "audio_bytes": 0, "video_bytes": 0, "other_bytes": 0}
        usage = self._storage.total_usage_bytes()
        audio_bytes = usage.get("audio", 0)
        video_bytes = usage.get("video", 0) + usage.get("thumbnails", 0)
        source_bytes = usage.get("uploads", 0)
        other_bytes = usage.get("tmp", 0)
        total = audio_bytes + video_bytes + source_bytes + other_bytes
        return {
            "total_bytes": total,
            "source_bytes": source_bytes,
            "audio_bytes": audio_bytes,
            "video_bytes": video_bytes,
            "other_bytes": other_bytes,
        }

    # ---- Export (build spec section 7) ----

    def export_project_data(self, owner_id: str, output_zip_path: str) -> str:
        lessons = self._all(Lesson, Lesson.owner_id == owner_id)
        with zipfile.ZipFile(output_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for lesson in lessons:
                base = f"lessons/{lesson.id}"
                zf.writestr(f"{base}/metadata.json", json.dumps(_row_to_dict(lesson), default=str, indent=2))
                for analysis in self._all(LessonAnalysis, LessonAnalysis.lesson_id == lesson.id):
                    zf.writestr(
                        f"{base}/analysis_v{analysis.version}.json",
                        json.dumps(analysis.analysis_json, indent=2),
                    )
                for example in self._all(Example, Example.lesson_id == lesson.id):
                    zf.writestr(
                        f"examples/{lesson.id}_v{example.version}.json",
                        json.dumps(
                            {
                                "original": example.original_example,
                                "generated": example.generated_example,
                                "verified": example.verified,
                            },
                            indent=2,
                        ),
                    )
                for plan in self._all(TeachingPlan, TeachingPlan.lesson_id == lesson.id):
                    zf.writestr(f"scripts/{lesson.id}_v{plan.version}.json", json.dumps(plan.plan_json, indent=2))
            zf.writestr(
                "metadata/export_info.json",
                json.dumps({"owner_id": owner_id, "lesson_count": len(lessons)}, indent=2),
            )
        # NOTE: never includes .env values, API keys, or DB/Redis/storage
        # credentials — only generated project content and metadata.
        return output_zip_path

    # ---- helpers ----

    def _get_owned_lesson(self, owner_id: str, lesson_id: str) -> Lesson:
        lesson = self._db.execute(
            select(Lesson).where(Lesson.id == lesson_id, Lesson.owner_id == owner_id)
        ).scalar_one_or_none()
        if lesson is None:
            raise LessonNotFoundError(lesson_id)
        return lesson

    def _scenes_for_lesson(self, lesson_id: str) -> list[Scene]:
        plan_ids = [
            row[0]
            for row in self._db.execute(
                select(TeachingPlan.id).where(TeachingPlan.lesson_id == lesson_id)
            ).all()
        ]
        if not plan_ids:
            return []
        return list(self._db.execute(select(Scene).where(Scene.teaching_plan_id.in_(plan_ids))).scalars())

    def _all(self, model, *conditions):
        return list(self._db.execute(select(model).where(*conditions)).scalars())

    def _count(self, model, *conditions) -> int:
        return len(self._all(model, *conditions))

    def _record_deletion(self, owner_id: str, asset_type: str, asset_id: str, reason: str) -> None:
        self._db.add(
            DeletionEvent(owner_id=owner_id, asset_type=asset_type, asset_id=asset_id, deletion_reason=reason)
        )


def _row_to_dict(row) -> dict:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}
