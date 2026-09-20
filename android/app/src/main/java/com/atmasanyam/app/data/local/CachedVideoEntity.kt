package com.atmasanyam.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Cached feed-card metadata for offline/poor-network browsing (spec §30).
 * Only lightweight card data is cached locally — video files themselves
 * are streamed from the CDN on demand, never bulk-downloaded automatically.
 */
@Entity(tableName = "cached_videos")
data class CachedVideoEntity(
    @PrimaryKey val videoId: String,
    val masterStoryId: String,
    val title: String,
    val thumbnailUrl: String?,
    val durationSeconds: Int?,
    val category: String,
    val state: String?,
    val district: String?,
    val publishedAt: String?,
    val sourceNamesCsv: String,
    val languageCode: String,
    val cachedAt: Long,
)
