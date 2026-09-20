package com.atmasanyam.app.data.repository

import com.atmasanyam.app.data.remote.ApiService
import com.atmasanyam.app.domain.model.VideoCard
import javax.inject.Inject
import javax.inject.Singleton

/** Search across people, city/district/state, category and date (spec §23). */
@Singleton
class SearchRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun search(query: String, languageCode: String, state: String? = null, category: String? = null): List<VideoCard> =
        api.search(query, languageCode, state, category).results.map {
            VideoCard(
                videoId = it.videoId,
                masterStoryId = it.masterStoryId,
                title = it.title,
                thumbnailUrl = it.thumbnailUrl,
                durationSeconds = null,
                category = it.category,
                state = it.state,
                district = it.district,
                publishedAt = it.publishedAt,
                sourceNames = emptyList(),
            )
        }
}
