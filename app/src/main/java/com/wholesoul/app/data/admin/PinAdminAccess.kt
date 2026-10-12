package com.wholesoul.app.data.admin

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.wholesoul.app.data.local.SessionPreferenceKeys
import com.wholesoul.app.domain.repository.AdminAccess
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import java.security.MessageDigest
import java.security.SecureRandom
import javax.inject.Inject
import javax.inject.Singleton

/** A PIN as it is stored: never the PIN itself, only a salted hash. */
data class StoredPin(val salt: ByteArray, val hash: ByteArray)

interface AdminPinStore {
    suspend fun load(): StoredPin?
    suspend fun save(pin: StoredPin)
}

@Singleton
class DataStoreAdminPinStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) : AdminPinStore {

    override suspend fun load(): StoredPin? {
        val prefs = dataStore.data.first()
        val salt = prefs[SessionPreferenceKeys.ADMIN_PIN_SALT]?.fromHex() ?: return null
        val hash = prefs[SessionPreferenceKeys.ADMIN_PIN_HASH]?.fromHex() ?: return null
        return StoredPin(salt, hash)
    }

    override suspend fun save(pin: StoredPin) {
        dataStore.edit {
            it[SessionPreferenceKeys.ADMIN_PIN_SALT] = pin.salt.toHex()
            it[SessionPreferenceKeys.ADMIN_PIN_HASH] = pin.hash.toHex()
        }
    }
}

/**
 * Keeps casual users out of the Admin Console with a 4-8 digit PIN kept on this phone.
 *
 * This is a convenience lock, not real security: a short PIN can always be guessed by someone
 * who has the device and enough patience. Real protection needs accounts on a server, which
 * can implement [AdminAccess] later without changing any admin screen.
 */
@Singleton
class PinAdminAccess @Inject constructor(
    private val store: AdminPinStore,
) : AdminAccess {

    private val unlocked = MutableStateFlow(false)
    override val isUnlocked: StateFlow<Boolean> = unlocked.asStateFlow()

    override suspend fun hasPin(): Boolean = store.load() != null

    override suspend fun setPin(pin: String): Result<Unit> {
        if (!isValidPin(pin)) return Result.failure(IllegalArgumentException("PIN must be $MIN_LENGTH to $MAX_LENGTH digits"))
        val salt = ByteArray(SALT_BYTES).also { SecureRandom().nextBytes(it) }
        store.save(StoredPin(salt, hash(salt, pin)))
        unlocked.value = true
        return Result.success(Unit)
    }

    override suspend fun unlock(pin: String): Boolean {
        val stored = store.load() ?: return false
        val matches = MessageDigest.isEqual(stored.hash, hash(stored.salt, pin))
        if (matches) unlocked.value = true
        return matches
    }

    override fun lock() {
        unlocked.value = false
    }

    private fun isValidPin(pin: String): Boolean = pin.length in MIN_LENGTH..MAX_LENGTH && pin.all { it.isDigit() }

    private fun hash(salt: ByteArray, pin: String): ByteArray =
        MessageDigest.getInstance("SHA-256").digest(salt + pin.toByteArray(Charsets.UTF_8))

    companion object {
        const val MIN_LENGTH = 4
        const val MAX_LENGTH = 8
        private const val SALT_BYTES = 16
    }
}

private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }

private fun String.fromHex(): ByteArray? =
    if (length % 2 != 0) null else runCatching { chunked(2).map { it.toInt(16).toByte() }.toByteArray() }.getOrNull()
