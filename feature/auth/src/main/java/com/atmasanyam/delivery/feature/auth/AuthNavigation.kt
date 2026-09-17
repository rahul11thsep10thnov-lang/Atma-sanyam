package com.atmasanyam.delivery.feature.auth

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

fun NavGraphBuilder.authMobileScreen(onCodeSent: () -> Unit, onBack: () -> Unit) {
    composable(Destination.AuthMobile.route) {
        ComingSoonScreen(
            title = "Enter your mobile number",
            description = "Phase 10 adds mobile-number entry and a \"Send code\" action that " +
                "calls POST /auth/request-code. No email, ever - mobile number is the only " +
                "identity. This screen only appears after BOOK DELIVERY is tapped, never at app launch.",
        ) {
            PrimaryButton(text = "Simulate code sent", onClick = onCodeSent)
            Spacer(modifier = Modifier.height(12.dp))
            SecondaryButton(text = "Back", onClick = onBack)
        }
    }
}

fun NavGraphBuilder.authVerifyCodeScreen(onVerified: () -> Unit, onBack: () -> Unit) {
    composable(Destination.AuthVerifyCode.route) {
        AuthVerifyCodePlaceholder(onVerified = onVerified, onBack = onBack)
    }
}

@Composable
private fun AuthVerifyCodePlaceholder(onVerified: () -> Unit, onBack: () -> Unit) {
    ComingSoonScreen(
        title = "Enter verification code",
        description = "Phase 10 adds the alphanumeric code field and calls " +
            "POST /auth/verify-code, with server-side rate limiting on both requesting and " +
            "verifying codes. On success, the guest's quote (pickup, destination, goods, " +
            "vehicle, price) carries straight through to booking confirmation.",
    ) {
        PrimaryButton(text = "Simulate verified", onClick = onVerified)
        Spacer(modifier = Modifier.height(12.dp))
        SecondaryButton(text = "Back", onClick = onBack)
    }
}
