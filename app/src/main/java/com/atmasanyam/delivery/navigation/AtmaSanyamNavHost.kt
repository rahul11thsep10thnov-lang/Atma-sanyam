package com.atmasanyam.delivery.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.rememberNavController
import com.atmasanyam.delivery.core.data.BookingFlowViewModel
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
 * each other directly. [BookingFlowViewModel] is created once here (scoped to the Activity,
 * since this composable runs before any NavBackStackEntry exists) and its state is threaded
 * through to the screens that need to read it, which is how the guest's in-progress order
 * survives navigating all the way through the auth step without being re-entered.
 */
@Composable
fun AtmaSanyamNavHost(navController: NavHostController = rememberNavController()) {
    val bookingFlowViewModel: BookingFlowViewModel = viewModel()
    val bookingFlowState = bookingFlowViewModel.state.collectAsState()

    NavHost(navController = navController, startDestination = Destination.Home.route) {
        homeScreen(
            onEnterGoodsDetails = { pickup, destination, route ->
                bookingFlowViewModel.setPickupAndDestination(pickup, destination, route)
                navController.navigate(Destination.GoodsDetails.route)
            },
        )
        goodsDetailsScreen(
            onContinueToVehicles = { goods ->
                bookingFlowViewModel.setGoodsDetails(goods)
                navController.navigate(Destination.VehicleSelection.route)
            },
            onBack = { navController.popBackStack() },
        )
        vehicleSelectionScreen(
            bookingFlowState = bookingFlowState,
            onVehicleSelected = { vehicleQuote ->
                bookingFlowViewModel.setSelectedVehicle(vehicleQuote)
                navController.navigate(Destination.BookingSummary.route)
            },
            onBack = { navController.popBackStack() },
        )
        bookingSummaryScreen(
            bookingFlowState = bookingFlowState,
            onBookDelivery = { navController.navigate(Destination.AuthMobile.route) },
            onBack = { navController.popBackStack() },
        )
        authMobileScreen(
            onCodeSent = { phoneNumber -> navController.navigate(Destination.AuthVerifyCode.createRoute(phoneNumber)) },
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
            bookingFlowState = bookingFlowState,
            onDone = {
                bookingFlowViewModel.reset()
                navController.navigate(Destination.Home.route) {
                    popUpTo(Destination.Home.route) { inclusive = true }
                    launchSingleTop = true
                }
            },
        )
    }
}
