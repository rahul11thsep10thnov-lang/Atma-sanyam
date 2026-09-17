package com.atmasanyam.delivery.feature.vehicle

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

fun NavGraphBuilder.vehicleSelectionScreen(onContinueToBookingSummary: () -> Unit, onBack: () -> Unit) {
    composable(Destination.VehicleSelection.route) {
        VehicleSelectionPlaceholder(onContinueToBookingSummary = onContinueToBookingSummary, onBack = onBack)
    }
}

@Composable
private fun VehicleSelectionPlaceholder(onContinueToBookingSummary: () -> Unit, onBack: () -> Unit) {
    ComingSoonScreen(
        title = "Available vehicles",
        description = "Phase 7 wires this screen to VehicleMatchingEngine and PricingEngine " +
            "(already implemented and unit-tested in core:model): vehicle cards with capacity, " +
            "suitable goods, ETA and a transparent price breakdown per option.",
    ) {
        PrimaryButton(text = "Continue to booking summary", onClick = onContinueToBookingSummary)
        Spacer(modifier = Modifier.height(12.dp))
        SecondaryButton(text = "Back", onClick = onBack)
    }
}
