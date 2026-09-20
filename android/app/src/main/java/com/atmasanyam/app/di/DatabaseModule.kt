package com.atmasanyam.app.di

import android.content.Context
import androidx.room.Room
import com.atmasanyam.app.data.local.AppDatabase
import com.atmasanyam.app.data.local.VideoDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "atma-sanyam.db").build()

    @Provides
    fun provideVideoDao(db: AppDatabase): VideoDao = db.videoDao()
}
