package com.rangepatte.app.data.auth

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class UserProfile(
    val uid: String,
    val phoneNumber: String,
    val displayName: String?
)

/**
 * Who is signed in on this device. The profile is cached locally (so the top bar knows instantly)
 * and mirrored to the online [UserDirectory] whenever the user signs in or their membership changes.
 */
class AccountRepository(
    context: Context,
    val authService: PhoneAuthService,
    private val directory: UserDirectory
) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val _currentUser = MutableStateFlow(loadProfile())

    val currentUser: StateFlow<UserProfile?> = _currentUser.asStateFlow()

    fun onSignedIn(uid: String, phoneNumber: String, displayName: String?, languageTag: String, adFreeUntilMillis: Long) {
        val profile = UserProfile(uid = uid, phoneNumber = phoneNumber, displayName = displayName?.trim()?.ifEmpty { null })
        prefs.edit {
            putString(KEY_UID, profile.uid)
            putString(KEY_PHONE, profile.phoneNumber)
            putString(KEY_NAME, profile.displayName)
        }
        _currentUser.value = profile
        directory.saveUser(profile, languageTag, adFreeUntilMillis)
    }

    /** Re-saves the signed-in user's record, e.g. after a membership payment or a language change. */
    fun syncUser(languageTag: String, adFreeUntilMillis: Long) {
        _currentUser.value?.let { directory.saveUser(it, languageTag, adFreeUntilMillis) }
    }

    fun signOut() {
        authService.signOut()
        prefs.edit { clear() }
        _currentUser.value = null
    }

    private fun loadProfile(): UserProfile? {
        val uid = prefs.getString(KEY_UID, null) ?: return null
        val phone = prefs.getString(KEY_PHONE, null) ?: return null
        return UserProfile(uid = uid, phoneNumber = phone, displayName = prefs.getString(KEY_NAME, null))
    }

    private companion object {
        const val PREFS_NAME = "account_prefs"
        const val KEY_UID = "uid"
        const val KEY_PHONE = "phone"
        const val KEY_NAME = "name"
    }
}
