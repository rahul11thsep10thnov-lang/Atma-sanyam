package com.atmasanyam.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "atma_sanyam_prefs")

/**
 * Persists the user's chosen language (spec §7 — "remember the user's
 * selected language") and other lightweight local state. No location/GPS
 * data is ever stored here — location filtering is a stateless UI
 * selection sent per-request (spec §20).
 */
@Singleton
class UserPreferencesDataStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private object Keys {
        val LANGUAGE_CODE = stringPreferencesKey("language_code")
        val HAS_ONBOARDED = booleanPreferencesKey("has_onboarded")
        val DEVICE_ID = stringPreferencesKey("device_id")
        val AUTH_TOKEN = stringPreferencesKey("auth_token")
        val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
        val SELECTED_STATE = stringPreferencesKey("selected_state")
        val SELECTED_DISTRICT = stringPreferencesKey("selected_district")
    }

    val languageCode: Flow<String?> = context.dataStore.data.map { it[Keys.LANGUAGE_CODE] }
    val hasOnboarded: Flow<Boolean> = context.dataStore.data.map { it[Keys.HAS_ONBOARDED] ?: false }
    val authToken: Flow<String?> = context.dataStore.data.map { it[Keys.AUTH_TOKEN] }
    val notificationsEnabled: Flow<Boolean> = context.dataStore.data.map { it[Keys.NOTIFICATIONS_ENABLED] ?: true }
    val selectedState: Flow<String?> = context.dataStore.data.map { it[Keys.SELECTED_STATE] }
    val selectedDistrict: Flow<String?> = context.dataStore.data.map { it[Keys.SELECTED_DISTRICT] }

    suspend fun setLanguageCode(code: String) {
        context.dataStore.edit { it[Keys.LANGUAGE_CODE] = code }
    }

    suspend fun setOnboarded(complete: Boolean) {
        context.dataStore.edit { it[Keys.HAS_ONBOARDED] = complete }
    }

    suspend fun setAuthToken(token: String) {
        context.dataStore.edit { it[Keys.AUTH_TOKEN] = token }
    }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.NOTIFICATIONS_ENABLED] = enabled }
    }

    /** No GPS/location permission is ever used — this is purely the user's manual India -> State -> District pick (spec §20). */
    suspend fun setSelectedLocation(state: String?, district: String?) {
        context.dataStore.edit {
            if (state != null) it[Keys.SELECTED_STATE] = state else it.remove(Keys.SELECTED_STATE)
            if (district != null) it[Keys.SELECTED_DISTRICT] = district else it.remove(Keys.SELECTED_DISTRICT)
        }
    }

    /** Locally-generated, non-identifying device id — used only to key an anonymous account. */
    suspend fun getOrCreateDeviceId(): String {
        val current = context.dataStore.data.map { it[Keys.DEVICE_ID] }.first()
        if (current != null) return current

        val newId = UUID.randomUUID().toString()
        context.dataStore.edit { it[Keys.DEVICE_ID] = newId }
        return newId
    }
}
