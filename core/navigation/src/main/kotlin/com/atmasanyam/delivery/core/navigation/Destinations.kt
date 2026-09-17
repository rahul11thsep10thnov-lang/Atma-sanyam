package com.atmasanyam.delivery.core.navigation

/**
 * Every top-level screen in the guest -> quote -> auth -> booking flow, in one place so
 * feature modules can navigate to each other by route without depending on each other's
 * Gradle modules (only the app module depends on every feature).
 */
sealed class Destination(val route: String) {
    data object Home : Destination("home")
    data object GoodsDetails : Destination("goods_details")
    data object VehicleSelection : Destination("vehicle_selection")
    data object BookingSummary : Destination("booking_summary")
    data object AuthMobile : Destination("auth_mobile")
    data object AuthVerifyCode : Destination("auth_verify_code")
    data object BookingConfirmation : Destination("booking_confirmation")
    data object LiveTracking : Destination("live_tracking")
    data object BookingHistory : Destination("booking_history")
}
