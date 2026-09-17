package com.atmasanyam.delivery.feature.auth

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.atmasanyam.delivery.core.navigation.Destination

fun NavGraphBuilder.authMobileScreen(onCodeSent: (phoneNumber: String) -> Unit, onBack: () -> Unit) {
    composable(Destination.AuthMobile.route) {
        AuthMobileScreen(onCodeSent = onCodeSent, onBack = onBack)
    }
}

fun NavGraphBuilder.authVerifyCodeScreen(onVerified: () -> Unit, onBack: () -> Unit) {
    composable(
        route = Destination.AuthVerifyCode.route,
        arguments = listOf(navArgument(Destination.AuthVerifyCode.ARG_PHONE_NUMBER) { type = NavType.StringType }),
    ) { backStackEntry ->
        val phoneNumber = backStackEntry.arguments?.getString(Destination.AuthVerifyCode.ARG_PHONE_NUMBER).orEmpty()
        AuthVerifyCodeScreen(phoneNumber = phoneNumber, onVerified = onVerified, onBack = onBack)
    }
}
