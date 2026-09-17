package com.atmasanyam.delivery.core.data

import androidx.lifecycle.ViewModel
import com.atmasanyam.delivery.core.model.BookingFlowState
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

    /** Called after a booking is confirmed, so the next order starts from a clean slate. */
    fun reset() {
        _state.update { BookingFlowState() }
    }
}
