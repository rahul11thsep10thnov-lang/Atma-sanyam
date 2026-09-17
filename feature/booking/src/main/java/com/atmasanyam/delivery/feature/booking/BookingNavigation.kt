package com.atmasanyam.delivery.feature.booking

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.atmasanyam.delivery.core.designsystem.components.ComingSoonScreen
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.navigation.Destination

fun NavGraphBuilder.bookingSummaryScreen(onBookDelivery: () -> Unit, onBack: () -> Unit) {
    composable(Destination.BookingSummary.route) {
        ComingSoonScreen(
            title = "Confirm your delivery",
            description = "Phase 11 shows the full summary here - pickup, destination, goods, " +
                "quantity, weight, dimensions, vehicle and price - with a BOOK DELIVERY button. " +
                "Authentication is only requested after this button is tapped, never before.",
        ) {
            PrimaryButton(text = "Book delivery", onClick = onBookDelivery)
            Spacer(modifier = Modifier.height(12.dp))
            SecondaryButton(text = "Back", onClick = onBack)
        }
    }
}

fun NavGraphBuilder.bookingConfirmationScreen(onDone: () -> Unit) {
    composable(Destination.BookingConfirmation.route) {
        BookingConfirmationPlaceholder(onDone = onDone)
    }
}

@Composable
private fun BookingConfirmationPlaceholder(onDone: () -> Unit) {
    ComingSoonScreen(
        title = "Booking confirmed",
        description = "Phase 11-14 generate a unique booking ID (e.g. WS-2026-000123), then " +
            "move through SEARCHING -> DRIVER ASSIGNED -> ... -> DELIVERED, with live tracking " +
            "on Google Maps once a driver is assigned.",
    ) {
        PrimaryButton(text = "Back to home", onClick = onDone)
    }
}
