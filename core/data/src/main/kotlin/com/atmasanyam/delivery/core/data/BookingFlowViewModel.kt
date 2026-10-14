package com.atmasanyam.delivery.core.data

import androidx.lifecycle.ViewModel
import com.atmasanyam.delivery.core.model.BookingFlowState
import com.atmasanyam.delivery.core.model.BookingIds
import com.atmasanyam.delivery.core.model.BookingRecord
import com.atmasanyam.delivery.core.model.DeliveryLocation
import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.model.Route
import com.atmasanyam.delivery.core.model.VehicleQuote
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Single source of truth for the in-progress guest order, scoped to the Activity (created once
 * in the NavHost, not per-screen) so every feature screen reads and writes the same state.
 */
class BookingFlowViewModel : ViewModel() {

    private val _state = MutableStateFlow(BookingFlowState())
    val state: StateFlow<BookingFlowState> = _state.asStateFlow()

    fun setPickupAndDestination(pickup: DeliveryLocation, destination: DeliveryLocation, route: Route) {
        _state.update { it.copy(pickup = pickup, destination = destination, route = route) }
    }

    fun setGoodsDetails(goodsDetails: GoodsDetails) {
        _state.update { it.copy(goodsDetails = goodsDetails) }
    }

    fun setSelectedVehicle(vehicleQuote: VehicleQuote) {
        _state.update { it.copy(selectedVehicleQuote = vehicleQuote) }
    }

    /**
     * Places the booking for the current order and remembers it as [BookingFlowState.confirmedBooking].
     * Returns null when the order is incomplete. The id is a client-side placeholder until the
     * backend issues real ones (Phase 12). Calling again for an already-confirmed order returns
     * the same booking, so a re-composition or double tap cannot create two.
     */
    fun confirmBooking(year: Int, nowEpochMillis: Long): BookingRecord? {
        val current = _state.value
        current.confirmedBooking?.let { return it }
        val vehicleQuote = current.selectedVehicleQuote ?: return null
        val pickup = current.pickup ?: return null
        val destination = current.destination ?: return null
        val record = BookingRecord(
            bookingId = BookingIds.generate(year),
            createdAtEpochMillis = nowEpochMillis,
            pickupAddress = pickup.addressLine,
            destinationAddress = destination.addressLine,
            vehicleName = vehicleQuote.vehicle.name,
            totalFare = vehicleQuote.priceBreakdown?.total,
        )
        _state.update { it.copy(confirmedBooking = record) }
        return record
    }

    /** Called after a booking is confirmed, so the next order starts from a clean slate. */
    fun reset() {
        _state.update { BookingFlowState() }
    }
}
