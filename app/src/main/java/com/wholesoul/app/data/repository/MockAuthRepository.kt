package com.wholesoul.app.data.repository

import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.core.DataStore
import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.domain.model.AuthState
import com.wholesoul.app.domain.model.User
import com.wholesoul.app.domain.repository.AuthRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

private object AuthKeys {
    val USER_ID = stringPreferencesKey("user_id")
    val NAME = stringPreferencesKey("name")
    val MOBILE = stringPreferencesKey("mobile")
    val IS_GUEST = booleanPreferencesKey("is_guest")
}

/**
 * Development-mode auth (spec section 8/39): OTP is mocked ("1234" always works), and the
 * resulting session is persisted to DataStore so the user stays logged in across app
 * restarts. Swap for a FirebaseAuthRepository later behind the same [AuthRepository] contract.
 */
@Singleton
class MockAuthRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) : AuthRepository {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    override val currentUser = MutableStateFlow<User?>(null)

    init {
        scope.launch {
            val prefs = dataStore.data.first()
            val userId = prefs[AuthKeys.USER_ID]
            if (userId != null) {
                val isGuest = prefs[AuthKeys.IS_GUEST] ?: false
                currentUser.value = User(
                    id = userId,
                    name = prefs[AuthKeys.NAME] ?: "Guest",
                    mobileNumber = prefs[AuthKeys.MOBILE] ?: "",
                    authState = if (isGuest) AuthState.GUEST else AuthState.LOGGED_IN,
                )
            }
        }
    }

    override suspend fun requestOtp(mobileNumber: String): Result<Unit> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        if (mobileNumber.length != 10) return Result.failure(IllegalArgumentException("Enter a valid 10-digit mobile number"))
        return Result.success(Unit)
    }

    override suspend fun verifyOtp(mobileNumber: String, otp: String): Result<User> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        if (otp != MOCK_OTP) return Result.failure(IllegalStateException("Incorrect OTP. Use $MOCK_OTP in Development Mode."))
        val user = User(id = UUID.randomUUID().toString(), name = "WHOLESOUL Customer", mobileNumber = mobileNumber, authState = AuthState.LOGGED_IN)
        persist(user, isGuest = false)
        currentUser.value = user
        return Result.success(user)
    }

    override suspend fun continueAsGuest(): Result<User> {
        val user = User(id = UUID.randomUUID().toString(), name = "Guest", mobileNumber = "", authState = AuthState.GUEST)
        persist(user, isGuest = true)
        currentUser.value = user
        return Result.success(user)
    }

    override suspend fun logout() {
        currentUser.value = null
        dataStore.edit { it.clear() }
    }

    private suspend fun persist(user: User, isGuest: Boolean) {
        dataStore.edit { prefs ->
            prefs[AuthKeys.USER_ID] = user.id
            prefs[AuthKeys.NAME] = user.name
            prefs[AuthKeys.MOBILE] = user.mobileNumber
            prefs[AuthKeys.IS_GUEST] = isGuest
        }
    }

    companion object {
        const val MOCK_OTP = "1234"
    }
}
