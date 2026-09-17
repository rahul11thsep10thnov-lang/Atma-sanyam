package com.atmasanyam.delivery.feature.booking

import androidx.compose.runtime.State
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.atmasanyam.delivery.core.model.BookingFlowState
import com.atmasanyam.delivery.core.navigation.Destination

fun NavGraphBuilder.bookingSummaryScreen(
    bookingFlowState: State<BookingFlowState>,
    onBookDelivery: () -> Unit,
    onBack: () -> Unit,
) {
    composable(Destination.BookingSummary.route) {
        BookingSummaryScreen(bookingFlowState = bookingFlowState, onBookDelivery = onBookDelivery, onBack = onBack)
    }
}

fun NavGraphBuilder.bookingConfirmationScreen(bookingFlowState: State<BookingFlowState>, onDone: () -> Unit) {
    composable(Destination.BookingConfirmation.route) {
        BookingConfirmationScreen(bookingFlowState = bookingFlowState, onDone = onDone)
    }
}
