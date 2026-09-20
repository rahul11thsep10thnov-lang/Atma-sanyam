package com.atmasanyam.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface VideoDao {
    @Query("SELECT * FROM cached_videos WHERE languageCode = :languageCode ORDER BY cachedAt DESC LIMIT :limit")
    fun observeCachedFeed(languageCode: String, limit: Int = 50): Flow<List<CachedVideoEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(videos: List<CachedVideoEntity>)

    @Query("DELETE FROM cached_videos WHERE languageCode = :languageCode")
    suspend fun clearForLanguage(languageCode: String)
}
