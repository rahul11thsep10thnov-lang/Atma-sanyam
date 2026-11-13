package com.wholesoul.app.domain.repository

import kotlinx.coroutines.flow.StateFlow

/**
 * Gate in front of the Admin Console. Today it is a PIN kept on the device; a backend login
 * can implement the same contract later without touching the admin screens.
 */
interface AdminAccess {
    val isUnlocked: StateFlow<Boolean>

    suspend fun hasPin(): Boolean

    /** Creates or replaces the PIN and unlocks the console. */
    suspend fun setPin(pin: String): Result<Unit>

    /** True (and the console unlocks) when [pin] matches the stored PIN. */
    suspend fun unlock(pin: String): Boolean

    fun lock()
}
