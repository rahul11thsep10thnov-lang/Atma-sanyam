package com.atmasanyam.delivery.core.model

/** A place the user saved for quick reuse (the "Favorite Locations" setting). */
data class FavoriteLocation(
    val id: String,
    val label: SavedAddressLabel,
    val address: String,
)

/**
 * A placed booking as the app remembers it for "Booking History". Until the backend exists
 * (Phase 12) this is the only record of a booking, and it lives on this device only.
 */
data class BookingRecord(
    val bookingId: String,
    val createdAtEpochMillis: Long,
    val pickupAddress: String,
    val destinationAddress: String,
    val vehicleName: String,
    val totalFare: Double?,
    val status: BookingStatus = BookingStatus.SEARCHING,
)

/**
 * An in-app notification. Only the type and booking id are stored; the UI words the title and
 * body in the user's current language.
 */
data class InAppNotification(
    val id: String,
    val type: NotificationType,
    val bookingId: String?,
    val createdAtEpochMillis: Long,
    val read: Boolean = false,
)

/**
 * Everything the app knows about the signed-in user. [phoneNumber] is null for a guest, which
 * is the signed-out state: guests can still get quotes, but account screens ask them to sign in.
 */
data class AccountState(
    val phoneNumber: String? = null,
    val displayName: String = "",
    val favorites: List<FavoriteLocation> = emptyList(),
    val bookings: List<BookingRecord> = emptyList(),
    val notifications: List<InAppNotification> = emptyList(),
) {
    val isSignedIn: Boolean get() = phoneNumber != null
    val unreadNotificationCount: Int get() = notifications.count { !it.read }
}
