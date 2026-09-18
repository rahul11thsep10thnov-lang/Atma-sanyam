package com.wholesoul.app.presentation.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar

@Composable
fun OtpScreen(
    mobile: String,
    onBack: () -> Unit,
    onVerified: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.loginSuccess) {
        if (state.loginSuccess) onVerified()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Verify OTP", onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
            Text("Enter the OTP sent to +91 $mobile", style = MaterialTheme.typography.titleMedium)
            Text(
                "Development Mode: use 1234",
                style = MaterialTheme.typography.bodySmall,
                color = WholesoulColors.TextSecondary,
            )
            Spacer(Modifier.height(20.dp))
            OutlinedTextField(
                value = state.otp,
                onValueChange = viewModel::onOtpChange,
                placeholder = { Text("4-digit OTP") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                singleLine = true,
                isError = state.errorMessage != null,
                modifier = Modifier.fillMaxWidth(),
            )
            state.errorMessage?.let {
                Text(it, color = WholesoulColors.Error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
            }
            Spacer(Modifier.height(20.dp))
            PrimaryButton(
                text = if (state.isLoading) "VERIFYING..." else "VERIFY & CONTINUE",
                onClick = { viewModel.verifyOtp(mobile) },
                enabled = state.otp.length == 4 && !state.isLoading,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
