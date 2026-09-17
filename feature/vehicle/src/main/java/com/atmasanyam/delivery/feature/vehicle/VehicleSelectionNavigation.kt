package com.atmasanyam.delivery.feature.vehicle

import androidx.compose.runtime.State
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.atmasanyam.delivery.core.model.BookingFlowState
import com.atmasanyam.delivery.core.model.VehicleQuote
import com.atmasanyam.delivery.core.navigation.Destination

fun NavGraphBuilder.vehicleSelectionScreen(
    bookingFlowState: State<BookingFlowState>,
    onVehicleSelected: (VehicleQuote) -> Unit,
    onBack: () -> Unit,
) {
    composable(Destination.VehicleSelection.route) {
        VehicleSelectionScreen(bookingFlowState = bookingFlowState, onVehicleSelected = onVehicleSelected, onBack = onBack)
    }
}
