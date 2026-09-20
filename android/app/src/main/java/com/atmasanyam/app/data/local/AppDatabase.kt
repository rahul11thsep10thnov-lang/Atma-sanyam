package com.atmasanyam.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [CachedVideoEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun videoDao(): VideoDao
}
