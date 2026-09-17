package com.atmasanyam.delivery.feature.home

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.atmasanyam.delivery.core.navigation.Destination

fun NavGraphBuilder.homeScreen(onEnterGoodsDetails: () -> Unit) {
    composable(Destination.Home.route) {
        HomeRoute(onEnterGoodsDetails = onEnterGoodsDetails)
    }
}
