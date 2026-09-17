package com.atmasanyam.delivery.feature.goods

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

fun NavGraphBuilder.goodsDetailsScreen(onContinueToVehicles: () -> Unit, onBack: () -> Unit) {
    composable(Destination.GoodsDetails.route) {
        GoodsDetailsPlaceholder(onContinueToVehicles = onContinueToVehicles, onBack = onBack)
    }
}

@Composable
private fun GoodsDetailsPlaceholder(onContinueToVehicles: () -> Unit, onBack: () -> Unit) {
    ComingSoonScreen(
        title = "What are you delivering?",
        description = "Goods category, quantity, weight and dimensions (Phases 5-9) land " +
            "here next: category chips, an item description field, a quantity stepper, " +
            "weight quick-picks and a length/width/height form with a feet/inches toggle.",
    ) {
        PrimaryButton(text = "Continue to vehicle selection", onClick = onContinueToVehicles)
        Spacer(modifier = Modifier.height(12.dp))
        SecondaryButton(text = "Back", onClick = onBack)
    }
}
