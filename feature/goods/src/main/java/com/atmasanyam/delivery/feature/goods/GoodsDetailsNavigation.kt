package com.atmasanyam.delivery.feature.goods

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.navigation.Destination

fun NavGraphBuilder.goodsDetailsScreen(onContinueToVehicles: (GoodsDetails) -> Unit, onBack: () -> Unit) {
    composable(Destination.GoodsDetails.route) {
        GoodsDetailsScreen(onContinue = onContinueToVehicles, onBack = onBack)
    }
}
