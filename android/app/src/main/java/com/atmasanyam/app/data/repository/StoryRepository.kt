package com.atmasanyam.app.data.repository

import com.atmasanyam.app.data.remote.ApiService
import com.atmasanyam.app.data.remote.dto.EngagementRequest
import com.atmasanyam.app.domain.model.StoryDetail
import com.atmasanyam.app.domain.model.VideoManifest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StoryRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getStory(id: String, languageCode: String): StoryDetail {
        val dto = api.getStory(id, languageCode)
        return StoryDetail(
            id = dto.id,
            title = dto.title,
            summary = dto.summary,
            category = dto.category,
            state = dto.state,
            district = dto.district,
            legalStatus = dto.legalStatus,
            currentStatus = dto.currentStatus,
            availableLanguages = dto.videos.map { it.languageCode },
            sourceNames = dto.sources.map { it.name },
            disclaimer = dto.disclaimer,
        )
    }

    suspend fun getVideoManifest(videoId: String): VideoManifest {
        val dto = api.getVideoManifest(videoId)
        return VideoManifest(
            videoId = dto.videoId,
            masterStoryId = dto.masterStoryId,
            playbackUrl = dto.playbackUrl,
            thumbnailUrl = dto.thumbnailUrl,
            durationSeconds = dto.durationSeconds,
            languageCode = dto.languageCode,
            subtitleUrl = dto.subtitleUrl,
            title = dto.title,
            location = dto.location,
            sourceNames = dto.sources.map { it.name },
            aiDisclosure = dto.aiDisclosure,
        )
    }

    suspend fun recordView(videoAssetId: String, watchSeconds: Int) {
        runCatching { api.recordView(EngagementRequest(videoAssetId = videoAssetId, watchSeconds = watchSeconds)) }
    }

    suspend fun recordLike(videoAssetId: String) {
        runCatching { api.recordLike(EngagementRequest(videoAssetId = videoAssetId)) }
    }

    suspend fun recordShare(videoAssetId: String, channel: String?) {
        runCatching { api.recordShare(EngagementRequest(videoAssetId = videoAssetId, channel = channel)) }
    }

    suspend fun recordSave(videoAssetId: String) {
        runCatching { api.recordSave(EngagementRequest(videoAssetId = videoAssetId)) }
    }

    suspend fun recordReport(videoAssetId: String, reason: String, notes: String?) {
        runCatching { api.recordReport(EngagementRequest(videoAssetId = videoAssetId, reason = reason, notes = notes)) }
    }
}
