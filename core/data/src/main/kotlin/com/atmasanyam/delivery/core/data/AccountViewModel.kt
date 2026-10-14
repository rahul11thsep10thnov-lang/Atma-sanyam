package com.atmasanyam.delivery.core.data

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import com.atmasanyam.delivery.core.model.AccountState
import com.atmasanyam.delivery.core.model.BookingRecord
import com.atmasanyam.delivery.core.model.FavoriteLocation
import com.atmasanyam.delivery.core.model.InAppNotification
import com.atmasanyam.delivery.core.model.NotificationType
import com.atmasanyam.delivery.core.model.SavedAddressLabel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

/**
 * Single source of truth for who is signed in and what belongs to them, scoped to the Activity
 * like [BookingFlowViewModel]. The session survives app restarts via [AccountStore].
 *
 * Sign-in is still the simulated phone + code step (real verification is Phase 12); this class
 * is the seam where a real auth/session client replaces [AccountStore] later.
 */
class AccountViewModel(application: Application) : AndroidViewModel(application) {
    private val store = AccountStore(application)

    private val _state = MutableStateFlow(store.restore())
    val state: StateFlow<AccountState> = _state.asStateFlow()

    /** Starts a session for [phoneNumber], restoring anything previously saved for that number. */
    fun signIn(phoneNumber: String) {
        val restored = store.load(phoneNumber)
        store.save(restored)
        _state.value = restored
    }

    /** Logs out: ends the session but leaves the user's saved data on the device. */
    fun signOut() {
        store.clearSession()
        _state.value = AccountState()
    }

    /**
     * Deletes the account's data stored on this device and signs out.
     * Returns false (and changes nothing) if the data could not be erased, so the UI never
     * claims a deletion that did not happen. Server-side deletion needs the backend (Phase 12).
     */
    fun deleteAccount(): Boolean {
        val phone = _state.value.phoneNumber ?: return false
        if (!store.deleteAll(phone)) return false
        _state.value = AccountState()
        return true
    }

    fun updateDisplayName(name: String) = update { it.copy(displayName = name.trim()) }

    fun addFavorite(label: SavedAddressLabel, address: String) = update {
        it.copy(favorites = it.favorites + FavoriteLocation(newId(), label, address.trim()))
    }

    fun removeFavorite(id: String) = update { state ->
        state.copy(favorites = state.favorites.filterNot { it.id == id })
    }

    /** Saves a placed booking (newest first) and adds its "booking confirmed" notification. */
    fun recordBooking(record: BookingRecord) = update {
        if (it.bookings.any { existing -> existing.bookingId == record.bookingId }) return@update it
        val notification = InAppNotification(
            id = newId(),
            type = NotificationType.BOOKING_CONFIRMED,
            bookingId = record.bookingId,
            createdAtEpochMillis = record.createdAtEpochMillis,
        )
        it.copy(bookings = listOf(record) + it.bookings, notifications = listOf(notification) + it.notifications)
    }

    fun markNotificationsRead() = update { state ->
        if (state.unreadNotificationCount == 0) state else state.copy(notifications = state.notifications.map { it.copy(read = true) })
    }

    fun clearNotifications() = update { it.copy(notifications = emptyList()) }

    private fun update(transform: (AccountState) -> AccountState) {
        val current = _state.value
        if (!current.isSignedIn) return
        val next = transform(current)
        if (next == current) return
        store.save(next)
        _state.value = next
    }

    private fun newId(): String = UUID.randomUUID().toString()
}
