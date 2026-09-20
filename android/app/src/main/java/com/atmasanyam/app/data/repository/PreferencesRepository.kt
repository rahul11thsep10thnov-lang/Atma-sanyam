package com.atmasanyam.app.data.repository

import com.atmasanyam.app.data.local.UserPreferencesDataStore
import com.atmasanyam.app.data.remote.ApiService
import com.atmasanyam.app.data.remote.dto.UserPreferenceDto
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/** Interest-based personalization (spec §22) — categories, followed states, notification opt-in. */
@Singleton
class PreferencesRepository @Inject constructor(
    private val api: ApiService,
    private val localPrefs: UserPreferencesDataStore,
) {
    val languageCode: Flow<String?> = localPrefs.languageCode
    val hasOnboarded: Flow<Boolean> = localPrefs.hasOnboarded
    val notificationsEnabled: Flow<Boolean> = localPrefs.notificationsEnabled
    val selectedState: Flow<String?> = localPrefs.selectedState
    val selectedDistrict: Flow<String?> = localPrefs.selectedDistrict

    suspend fun setLanguage(code: String) = localPrefs.setLanguageCode(code)
    suspend fun completeOnboarding() = localPrefs.setOnboarded(true)
    suspend fun setNotificationsEnabled(enabled: Boolean) = localPrefs.setNotificationsEnabled(enabled)
    suspend fun setSelectedLocation(state: String?, district: String?) = localPrefs.setSelectedLocation(state, district)

    suspend fun getRemotePreferences(): UserPreferenceDto = api.getPreferences().preference

    suspend fun updateRemotePreferences(categories: List<String>, states: List<String>, notificationsEnabled: Boolean): UserPreferenceDto {
        val result = api.updatePreferences(UserPreferenceDto(categories, states, notificationsEnabled))
        setNotificationsEnabled(notificationsEnabled)
        return result.preference
    }
}
