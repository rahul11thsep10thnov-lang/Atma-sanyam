package com.atmasanyam.delivery.core.model

/**
 * Everything the guest has entered so far, in one place, so it survives navigating through
 * goods details -> vehicle selection -> booking summary -> the auth step -> booking
 * confirmation without being re-entered (see requirement that the guest's in-progress quote
 * is never lost when authentication happens). Plain domain data - held by a ViewModel in
 * core:data, but with no Android dependency itself.
 */
data class BookingFlowState(
    val pickup: DeliveryLocation? = null,
    val destination: DeliveryLocation? = null,
    val route: Route? = null,
    val goodsDetails: GoodsDetails? = null,
    val selectedVehicleQuote: VehicleQuote? = null,
) {
    val hasPickupAndDestination: Boolean get() = pickup != null && destination != null
    val hasGoodsDetails: Boolean get() = goodsDetails != null
}
