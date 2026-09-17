package com.atmasanyam.delivery.core.model

enum class BookingStatus {
    SEARCHING,
    DRIVER_ASSIGNED,
    DRIVER_ACCEPTED,
    DRIVER_ARRIVING,
    DRIVER_AT_PICKUP,
    GOODS_LOADED,
    IN_TRANSIT,
    DELIVERED,
    CANCELLED,
    FAILED,
    EXPIRED,
}

data class Booking(
    val bookingId: String,
    val quote: Quote,
    val selectedVehicle: VehicleQuote,
    val status: BookingStatus,
    val userId: String,
    val driverId: String? = null,
    val createdAtEpochMillis: Long,
)

data class Driver(
    val driverId: String,
    val name: String,
    val phoneNumber: String,
    val vehicle: DriverVehicle,
    val rating: Double,
    val isOnline: Boolean,
)

data class DriverVehicle(
    val vehicleCategoryId: String,
    val registrationNumber: String,
    val model: String,
)

data class DriverLocation(
    val driverId: String,
    val point: GeoPoint,
    val bearing: Float,
    val updatedAtEpochMillis: Long,
)

enum class ProofType { OTP, SIGNATURE, PHOTO }

data class ProofOfDelivery(
    val bookingId: String,
    val type: ProofType,
    val otpCode: String? = null,
    val signatureImageUrl: String? = null,
    val photoUrl: String? = null,
    val capturedAtEpochMillis: Long,
)

enum class PaymentMethod { UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET, CASH }

enum class PaymentStatus { PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED }

data class Payment(
    val paymentId: String,
    val bookingId: String,
    val amount: Double,
    val method: PaymentMethod,
    val status: PaymentStatus,
)

/** Identity for an unauthenticated visitor, so their quote survives the login step. */
data class GuestSession(
    val sessionId: String,
    val createdAtEpochMillis: Long,
)

data class User(
    val userId: String,
    val phoneNumber: String,
    val displayName: String? = null,
)

data class SavedAddress(
    val addressId: String,
    val userId: String,
    val label: SavedAddressLabel,
    val location: DeliveryLocation,
)

enum class NotificationType {
    DRIVER_ASSIGNED, DRIVER_ARRIVING, GOODS_LOADED, DELIVERED, CANCELLED, PROMOTIONAL
}

data class AppNotification(
    val notificationId: String,
    val userId: String,
    val type: NotificationType,
    val title: String,
    val body: String,
    val bookingId: String? = null,
    val sentAtEpochMillis: Long,
)
