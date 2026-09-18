package com.wholesoul.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.wholesoul.app.presentation.address.AddEditAddressScreen
import com.wholesoul.app.presentation.address.AddressListScreen
import com.wholesoul.app.presentation.auth.LoginScreen
import com.wholesoul.app.presentation.auth.OtpScreen
import com.wholesoul.app.presentation.cart.CartScreen
import com.wholesoul.app.presentation.categories.CategoriesScreen
import com.wholesoul.app.presentation.checkout.CheckoutScreen
import com.wholesoul.app.presentation.help.HelpScreen
import com.wholesoul.app.presentation.home.HomeScreen
import com.wholesoul.app.presentation.legal.LegalScreen
import com.wholesoul.app.presentation.notifications.NotificationsScreen
import com.wholesoul.app.presentation.offers.OffersScreen
import com.wholesoul.app.presentation.onboarding.OnboardingScreen
import com.wholesoul.app.presentation.orderconfirmation.OrderConfirmationScreen
import com.wholesoul.app.presentation.orderdetails.OrderDetailsScreen
import com.wholesoul.app.presentation.orders.OrdersScreen
import com.wholesoul.app.presentation.productdetails.ProductDetailsScreen
import com.wholesoul.app.presentation.productlisting.ProductListingScreen
import com.wholesoul.app.presentation.profile.ProfileScreen
import com.wholesoul.app.presentation.search.SearchScreen
import com.wholesoul.app.presentation.splash.SplashDestination
import com.wholesoul.app.presentation.splash.SplashRoute
import com.wholesoul.app.presentation.wishlist.WishlistScreen

private val bottomNavRoutes = BottomNavDestination.entries.map { it.route }.toSet()

@Composable
fun WholesoulApp() {
    val navController = rememberNavController()
    val rootViewModel: RootViewModel = hiltViewModel()
    val cartItemCount by rootViewModel.cartItemCount.collectAsState()

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.hierarchy?.firstOrNull { it.route in bottomNavRoutes }?.route

    Scaffold(
        bottomBar = {
            if (currentRoute in bottomNavRoutes) {
                WholesoulBottomBar(navController = navController, cartItemCount = cartItemCount)
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            WholesoulNavHost(navController)
        }
    }
}

@Composable
private fun WholesoulNavHost(navController: NavHostController) {
    NavHost(navController = navController, startDestination = Routes.SPLASH) {
        composable(Routes.SPLASH) {
            SplashRoute(
                onNavigate = { destination ->
                    val target = when (destination) {
                        SplashDestination.ONBOARDING -> Routes.ONBOARDING
                        SplashDestination.LOGIN -> Routes.LOGIN
                        SplashDestination.HOME -> Routes.HOME
                    }
                    navController.navigate(target) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.ONBOARDING) {
            OnboardingScreen(
                onFinished = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.LOGIN) {
            LoginScreen(
                onOtpRequested = { mobile -> navController.navigate(Routes.otp(mobile)) },
                onGuestContinue = {
                    navController.navigate(Routes.HOME) { popUpTo(Routes.LOGIN) { inclusive = true } }
                },
            )
        }

        composable(Routes.OTP, arguments = listOf(navArgument("mobile") { type = NavType.StringType })) { backStackEntry ->
            val mobile = backStackEntry.arguments?.getString("mobile").orEmpty()
            OtpScreen(
                mobile = mobile,
                onBack = { navController.popBackStack() },
                onVerified = {
                    navController.navigate(Routes.HOME) { popUpTo(Routes.LOGIN) { inclusive = true } }
                },
            )
        }

        composable(Routes.HOME) {
            HomeScreen(
                onAddressClick = { navController.navigate(Routes.addressList(selectMode = true)) },
                onSearchClick = { navController.navigate(Routes.SEARCH) },
                onNotificationsClick = { navController.navigate(Routes.NOTIFICATIONS) },
                onCategoryClick = { category -> navController.navigate(Routes.productListing(category.name)) },
                onProductClick = { product -> navController.navigate(Routes.productDetails(product.id)) },
            )
        }

        composable(Routes.CATEGORIES) {
            CategoriesScreen(
                onCategoryClick = { category -> navController.navigate(Routes.productListing(category.name)) },
            )
        }

        composable(
            Routes.PRODUCT_LISTING,
            arguments = listOf(navArgument("categoryName") { type = NavType.StringType }),
        ) {
            ProductListingScreen(
                onBack = { navController.popBackStack() },
                onProductClick = { product -> navController.navigate(Routes.productDetails(product.id)) },
            )
        }

        composable(
            Routes.PRODUCT_DETAILS,
            arguments = listOf(navArgument("productId") { type = NavType.StringType }),
        ) {
            ProductDetailsScreen(
                onBack = { navController.popBackStack() },
                onProductClick = { product ->
                    navController.navigate(Routes.productDetails(product.id))
                },
                onGoToCart = { navController.navigate(Routes.CART) },
            )
        }

        composable(Routes.SEARCH) {
            SearchScreen(onProductClick = { product -> navController.navigate(Routes.productDetails(product.id)) })
        }

        composable(Routes.CART) {
            CartScreen(
                onBrowseProducts = {
                    navController.navigate(Routes.HOME) { popUpTo(Routes.HOME) { inclusive = false }; launchSingleTop = true }
                },
                onCheckout = { navController.navigate(Routes.CHECKOUT) },
            )
        }

        composable(
            Routes.ADDRESS_LIST,
            arguments = listOf(navArgument("selectMode") { type = NavType.BoolType; defaultValue = false }),
        ) { backStackEntry ->
            val selectMode = backStackEntry.arguments?.getBoolean("selectMode") ?: false
            AddressListScreen(
                onBack = { navController.popBackStack() },
                onAddAddress = { navController.navigate(Routes.ADD_ADDRESS) },
                onEditAddress = { addressId -> navController.navigate(Routes.editAddress(addressId)) },
                popOnSelect = selectMode,
            )
        }

        composable(Routes.ADD_ADDRESS) {
            AddEditAddressScreen(
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() },
            )
        }

        composable(
            Routes.EDIT_ADDRESS,
            arguments = listOf(navArgument("addressId") { type = NavType.StringType }),
        ) {
            AddEditAddressScreen(
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() },
            )
        }

        composable(Routes.CHECKOUT) {
            CheckoutScreen(
                onBack = { navController.popBackStack() },
                onChangeAddress = { navController.navigate(Routes.addressList(selectMode = true)) },
                onOrderPlaced = { orderId ->
                    navController.navigate(Routes.orderConfirmation(orderId)) {
                        popUpTo(Routes.HOME) { inclusive = false }
                    }
                },
            )
        }

        composable(
            Routes.ORDER_CONFIRMATION,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) {
            OrderConfirmationScreen(
                onTrackOrder = { orderId ->
                    navController.navigate(Routes.orderDetails(orderId)) {
                        popUpTo(Routes.HOME) { inclusive = false }
                    }
                },
                onContinueShopping = {
                    navController.navigate(Routes.HOME) { popUpTo(Routes.HOME) { inclusive = false }; launchSingleTop = true }
                },
            )
        }

        composable(Routes.ORDERS) {
            OrdersScreen(onOrderClick = { orderId -> navController.navigate(Routes.orderDetails(orderId)) })
        }

        composable(
            Routes.ORDER_DETAILS,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) {
            OrderDetailsScreen(
                onBack = { navController.popBackStack() },
                onGetHelp = { navController.navigate(Routes.HELP) },
                onReorderComplete = { navController.navigate(Routes.CART) },
            )
        }

        composable(Routes.WISHLIST) {
            WishlistScreen(onProductClick = { product -> navController.navigate(Routes.productDetails(product.id)) })
        }

        composable(Routes.PROFILE) {
            ProfileScreen(
                onNavigateOrders = { navController.navigate(Routes.ORDERS) },
                onNavigateAddresses = { navController.navigate(Routes.addressList(selectMode = false)) },
                onNavigateWishlist = { navController.navigate(Routes.WISHLIST) },
                onNavigateOffers = { navController.navigate(Routes.OFFERS) },
                onNavigateNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                onNavigateHelp = { navController.navigate(Routes.HELP) },
                onNavigateLegal = { docType -> navController.navigate(Routes.legal(docType.name)) },
                onLoggedOut = {
                    navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                },
            )
        }

        composable(Routes.OFFERS) {
            OffersScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.NOTIFICATIONS) {
            NotificationsScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.HELP) {
            HelpScreen(onBack = { navController.popBackStack() })
        }

        composable(
            Routes.LEGAL,
            arguments = listOf(navArgument("docType") { type = NavType.StringType }),
        ) { backStackEntry ->
            val docType = LegalDocType.valueOf(backStackEntry.arguments?.getString("docType") ?: LegalDocType.ABOUT.name)
            LegalScreen(docType = docType, onBack = { navController.popBackStack() })
        }
    }
}
