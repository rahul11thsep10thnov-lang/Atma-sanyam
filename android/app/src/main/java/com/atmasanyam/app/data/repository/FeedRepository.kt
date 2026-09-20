package com.atmasanyam.app.data.repository

import com.atmasanyam.app.data.local.CachedVideoEntity
import com.atmasanyam.app.data.local.VideoDao
import com.atmasanyam.app.data.remote.ApiService
import com.atmasanyam.app.data.remote.dto.FeedVideoDto
import com.atmasanyam.app.domain.model.VideoCard
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

data class FeedPage(val videos: List<VideoCard>, val nextCursor: String?)

/**
 * Cursor-paginated feed (spec §18). Falls back to the local Room cache when
 * the network call fails, so browsing degrades gracefully on poor Indian
 * mobile networks instead of showing a blank screen (spec §30).
 */
@Singleton
class FeedRepository @Inject constructor(
    private val api: ApiService,
    private val videoDao: VideoDao,
) {
    suspend fun loadFeed(
        languageCode: String,
        category: String? = null,
        state: String? = null,
        district: String? = null,
        cursor: String? = null,
    ): FeedPage {
        return try {
            val response = api.getFeed(languageCode, category, state, district, cursor)
            if (cursor == null) {
                videoDao.clearForLanguage(languageCode)
            }
            videoDao.upsertAll(response.videos.map { it.toCachedEntity(languageCode) })
            FeedPage(response.videos.map { it.toDomain() }, response.nextCursor)
        } catch (e: Exception) {
            if (cursor == null) {
                FeedPage(loadCachedFeed(languageCode), null)
            } else {
                throw e
            }
        }
    }

    private suspend fun loadCachedFeed(languageCode: String): List<VideoCard> =
        videoDao.observeCachedFeed(languageCode).first().map { it.toDomain() }
}

private fun FeedVideoDto.toDomain() = VideoCard(
    videoId = videoId,
    masterStoryId = masterStoryId,
    title = title,
    thumbnailUrl = thumbnailUrl,
    durationSeconds = durationSeconds,
    category = category,
    state = state,
    district = district,
    publishedAt = publishedAt,
    sourceNames = sourceNames,
)

private fun FeedVideoDto.toCachedEntity(languageCode: String) = CachedVideoEntity(
    videoId = videoId,
    masterStoryId = masterStoryId,
    title = title,
    thumbnailUrl = thumbnailUrl,
    durationSeconds = durationSeconds,
    category = category,
    state = state,
    district = district,
    publishedAt = publishedAt,
    sourceNamesCsv = sourceNames.joinToString(","),
    languageCode = languageCode,
    cachedAt = System.currentTimeMillis(),
)

private fun CachedVideoEntity.toDomain() = VideoCard(
    videoId = videoId,
    masterStoryId = masterStoryId,
    title = title,
    thumbnailUrl = thumbnailUrl,
    durationSeconds = durationSeconds,
    category = category,
    state = state,
    district = district,
    publishedAt = publishedAt,
    sourceNames = sourceNamesCsv.split(",").filter { it.isNotBlank() },
)
