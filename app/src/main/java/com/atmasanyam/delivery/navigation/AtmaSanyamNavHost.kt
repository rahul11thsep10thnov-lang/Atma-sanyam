package com.atmasanyam.delivery.navigation

import android.widget.Toast
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.atmasanyam.delivery.R
import com.atmasanyam.delivery.core.data.AccountViewModel
import com.atmasanyam.delivery.core.data.BookingFlowViewModel
import com.atmasanyam.delivery.core.mapgoogle.GoogleDeliveryMapRenderer
import com.atmasanyam.delivery.core.model.AppLanguage
import com.atmasanyam.delivery.core.navigation.Destination
import com.atmasanyam.delivery.feature.account.AccountActions
import com.atmasanyam.delivery.feature.account.accountGraph
import com.atmasanyam.delivery.feature.auth.authMobileScreen
import com.atmasanyam.delivery.feature.auth.authVerifyCodeScreen
import com.atmasanyam.delivery.feature.booking.bookingConfirmationScreen
import com.atmasanyam.delivery.feature.booking.bookingSummaryScreen
import com.atmasanyam.delivery.feature.goods.goodsDetailsScreen
import com.atmasanyam.delivery.feature.home.HomeMenuItem
import com.atmasanyam.delivery.feature.home.homeScreen
import com.atmasanyam.delivery.feature.vehicle.vehicleSelectionScreen
import com.atmasanyam.delivery.splash.SplashScreen
import java.util.Calendar

/**
 * Wires every feature module's screens into the single guest -> quote -> auth -> booking flow.
 * Only this app-level module is allowed to depend on every feature; features never depend on
 * each other directly. [BookingFlowViewModel] is created once here (scoped to the Activity,
 * since this composable runs before any NavBackStackEntry exists) and its state is threaded
 * through to the screens that need to read it, which is how the guest's in-progress order
 * survives navigating all the way through the auth step without being re-entered.
 *
 * [AccountViewModel] (also Activity-scoped) holds who is signed in. Guests can browse and get a
 * quote; screens that need an account show a "Sign in" prompt that reuses the same
 * mobile-number + code screens as booking, then returns to where the user was.
 */
@Composable
fun AtmaSanyamNavHost(
    onLanguageSelected: (AppLanguage) -> Unit,
    navController: NavHostController = rememberNavController(),
) {
    val bookingFlowViewModel: BookingFlowViewModel = viewModel()
    val bookingFlowState = bookingFlowViewModel.state.collectAsState()
    val accountViewModel: AccountViewModel = viewModel()
    val accountState = accountViewModel.state.collectAsState()
    val accountActions = remember(accountViewModel) {
        AccountActions(
            updateDisplayName = accountViewModel::updateDisplayName,
            addFavorite = accountViewModel::addFavorite,
            removeFavorite = accountViewModel::removeFavorite,
            markNotificationsRead = accountViewModel::markNotificationsRead,
            clearNotifications = accountViewModel::clearNotifications,
            signOut = accountViewModel::signOut,
            deleteAccount = accountViewModel::deleteAccount,
        )
    }
    val context = LocalContext.current
    // Why the sign-in screens were opened: true = finishing a booking, false = reaching an account screen.
    var signInForBooking by rememberSaveable { mutableStateOf(true) }
    // The only line that needs to change to swap map providers (see core:map-api).
    val mapRenderer = remember { GoogleDeliveryMapRenderer() }

    fun placeBookingAndShowConfirmation() {
        val record = bookingFlowViewModel.confirmBooking(
            year = Calendar.getInstance().get(Calendar.YEAR),
            nowEpochMillis = System.currentTimeMillis(),
        )
        if (record != null) accountViewModel.recordBooking(record)
        navController.navigate(Destination.BookingConfirmation.route) {
            popUpTo(Destination.Home.route) { inclusive = false }
        }
    }

    fun openSignIn(forBooking: Boolean) {
        signInForBooking = forBooking
        navController.navigate(Destination.AuthMobile.route)
    }

    fun returnHomeWithMessage(messageRes: Int) {
        Toast.makeText(context, context.getString(messageRes), Toast.LENGTH_SHORT).show()
        navController.popBackStack(Destination.Home.route, inclusive = false)
    }

    val signedInAccount = accountState.value
    val userLabel = if (signedInAccount.isSignedIn) {
        signedInAccount.displayName.ifBlank { "+91 ${signedInAccount.phoneNumber}" }
    } else {
        null
    }

    NavHost(navController = navController, startDestination = Destination.Splash.route) {
        composable(Destination.Splash.route) {
            SplashScreen(
                onFinished = {
                    // Remove the splash from the back stack so Back on Home leaves the app.
                    navController.navigate(Destination.Home.route) {
                        popUpTo(Destination.Splash.route) { inclusive = true }
                    }
                },
            )
        }
        homeScreen(
            mapRenderer = mapRenderer,
            onEnterGoodsDetails = { pickup, destination, route ->
                bookingFlowViewModel.setPickupAndDestination(pickup, destination, route)
                navController.navigate(Destination.GoodsDetails.route)
            },
            onLanguageSelected = onLanguageSelected,
            userLabel = userLabel,
            onMenuItemSelected = { item ->
                val destination = when (item) {
                    HomeMenuItem.PROFILE -> Destination.Profile
                    HomeMenuItem.HELP -> Destination.Help
                    HomeMenuItem.BOOKING_HISTORY -> Destination.BookingHistory
                    HomeMenuItem.SAFETY -> Destination.Safety
                    HomeMenuItem.REFER_AND_EARN -> Destination.ReferAndEarn
                    HomeMenuItem.MY_REWARDS -> Destination.MyRewards
                    HomeMenuItem.NOTIFICATIONS -> Destination.Notifications
                    HomeMenuItem.SETTINGS -> Destination.Settings
                }
                navController.navigate(destination.route) { launchSingleTop = true }
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
            onBookDelivery = {
                // Already signed in: no need to ask for the code again.
                if (accountState.value.isSignedIn) placeBookingAndShowConfirmation() else openSignIn(forBooking = true)
            },
            onBack = { navController.popBackStack() },
        )
        authMobileScreen(
            onCodeSent = { phoneNumber -> navController.navigate(Destination.AuthVerifyCode.createRoute(phoneNumber)) },
            onBack = { navController.popBackStack() },
        )
        authVerifyCodeScreen(
            onVerified = { phoneNumber ->
                accountViewModel.signIn(phoneNumber)
                if (signInForBooking) {
                    placeBookingAndShowConfirmation()
                } else {
                    // Back to the account screen that asked the user to sign in.
                    navController.popBackStack(Destination.AuthMobile.route, inclusive = true)
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
        accountGraph(
            account = accountState,
            actions = accountActions,
            onBack = { navController.popBackStack() },
            onSignIn = { openSignIn(forBooking = false) },
            onOpenProfile = { navController.navigate(Destination.Profile.route) },
            onOpenFavoriteLocations = { navController.navigate(Destination.FavoriteLocations.route) },
            onOpenDeleteAccount = { navController.navigate(Destination.DeleteAccount.route) },
            onLoggedOut = { returnHomeWithMessage(R.string.logged_out_message) },
            onAccountDeleted = { returnHomeWithMessage(R.string.account_deleted_message) },
        )
    }
}
