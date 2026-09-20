package com.atmasanyam.app.data.repository

import com.atmasanyam.app.data.local.UserPreferencesDataStore
import com.atmasanyam.app.data.remote.ApiService
import com.atmasanyam.app.data.remote.dto.AnonymousAuthRequest
import com.atmasanyam.app.data.remote.dto.DeviceRegisterRequest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Anonymous, device-id-based auth — no GPS/location and minimal PII
 * collected (spec §20/§33). A user may later be upgraded to an email
 * account without changing this flow's contract.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val prefs: UserPreferencesDataStore,
) {
    suspend fun ensureAuthenticated(preferredLanguageCode: String) {
        val deviceId = prefs.getOrCreateDeviceId()
        val response = api.anonymousAuth(AnonymousAuthRequest(deviceId, preferredLanguageCode))
        prefs.setAuthToken(response.token)
    }

    suspend fun registerFcmToken(token: String) {
        runCatching { api.registerDevice(DeviceRegisterRequest(token)) }
    }
}
