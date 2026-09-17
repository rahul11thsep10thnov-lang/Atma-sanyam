package com.atmasanyam.delivery.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.rememberNavController
import com.atmasanyam.delivery.core.navigation.Destination
import com.atmasanyam.delivery.feature.auth.authMobileScreen
import com.atmasanyam.delivery.feature.auth.authVerifyCodeScreen
import com.atmasanyam.delivery.feature.booking.bookingConfirmationScreen
import com.atmasanyam.delivery.feature.booking.bookingSummaryScreen
import com.atmasanyam.delivery.feature.goods.goodsDetailsScreen
import com.atmasanyam.delivery.feature.home.homeScreen
import com.atmasanyam.delivery.feature.vehicle.vehicleSelectionScreen

/**
 * Wires every feature module's screens into the single guest -> quote -> auth -> booking flow.
 * Only this app-level module is allowed to depend on every feature; features never depend on
 * each other directly, which is why each step is passed its "next" step as a plain callback.
 */
@Composable
fun AtmaSanyamNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(navController = navController, startDestination = Destination.Home.route) {
        homeScreen(
            onEnterGoodsDetails = { navController.navigate(Destination.GoodsDetails.route) },
        )
        goodsDetailsScreen(
            onContinueToVehicles = { navController.navigate(Destination.VehicleSelection.route) },
            onBack = { navController.popBackStack() },
        )
        vehicleSelectionScreen(
            onContinueToBookingSummary = { navController.navigate(Destination.BookingSummary.route) },
            onBack = { navController.popBackStack() },
        )
        bookingSummaryScreen(
            onBookDelivery = { navController.navigate(Destination.AuthMobile.route) },
            onBack = { navController.popBackStack() },
        )
        authMobileScreen(
            onCodeSent = { navController.navigate(Destination.AuthVerifyCode.route) },
            onBack = { navController.popBackStack() },
        )
        authVerifyCodeScreen(
            onVerified = {
                navController.navigate(Destination.BookingConfirmation.route) {
                    popUpTo(Destination.Home.route) { inclusive = false }
                }
            },
            onBack = { navController.popBackStack() },
        )
        bookingConfirmationScreen(
            onDone = {
                navController.navigate(Destination.Home.route) {
                    popUpTo(Destination.Home.route) { inclusive = true }
                    launchSingleTop = true
                }
            },
        )
    }
}
