package com.wholesoul.app.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.wholesoul.app.core.analytics.AnalyticsLogger
import com.wholesoul.app.core.analytics.LogcatAnalyticsLogger
import com.wholesoul.app.core.image.ImageProvider
import com.wholesoul.app.core.image.PlaceholderImageProvider
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private val Context.sessionDataStore: DataStore<Preferences> by preferencesDataStore(name = "wholesoul_session")

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideSessionDataStore(@ApplicationContext context: Context): DataStore<Preferences> = context.sessionDataStore
}

@Module
@InstallIn(SingletonComponent::class)
abstract class BindingsModule {
    /** Swap for a CDN/Firebase-Storage backed provider once real product photography is ready. */
    @Binds
    @Singleton
    abstract fun bindImageProvider(impl: PlaceholderImageProvider): ImageProvider

    /** Swap for a Firebase Analytics-backed logger when ready; no call site changes. */
    @Binds
    @Singleton
    abstract fun bindAnalyticsLogger(impl: LogcatAnalyticsLogger): AnalyticsLogger
}
