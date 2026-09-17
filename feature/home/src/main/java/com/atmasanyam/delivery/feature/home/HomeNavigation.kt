package com.atmasanyam.delivery.feature.home

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.atmasanyam.delivery.core.mapapi.DeliveryMapRenderer
import com.atmasanyam.delivery.core.model.DeliveryLocation
import com.atmasanyam.delivery.core.model.Route
import com.atmasanyam.delivery.core.navigation.Destination

fun NavGraphBuilder.homeScreen(
    mapRenderer: DeliveryMapRenderer,
    onEnterGoodsDetails: (pickup: DeliveryLocation, destination: DeliveryLocation, route: Route) -> Unit,
) {
    composable(Destination.Home.route) {
        HomeRoute(mapRenderer = mapRenderer, onEnterGoodsDetails = onEnterGoodsDetails)
    }
}
