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
import com.wholesoul.app.core.designsystem.components.SecondaryButton

@Composable
fun LoginScreen(
    onOtpRequested: (mobile: String) -> Unit,
    onGuestContinue: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.guestSuccess) {
        if (state.guestSuccess) onGuestContinue()
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("WHOLESOUL", style = MaterialTheme.typography.displaySmall, color = WholesoulColors.PrimaryDark)
        Text("घर बैठे ताजा फल, फूल, माला और सब्जी खरीदें", style = MaterialTheme.typography.bodyMedium, color = WholesoulColors.TextSecondary)

        Spacer(Modifier.height(40.dp))
        Text("Enter your mobile number", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = state.mobileNumber,
            onValueChange = viewModel::onMobileNumberChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("10-digit mobile number") },
            leadingIcon = { Text("+91", modifier = Modifier.padding(start = 8.dp)) },
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
            isError = state.errorMessage != null,
        )
        state.errorMessage?.let {
            Text(it, color = WholesoulColors.Error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
        }

        Spacer(Modifier.height(20.dp))
        PrimaryButton(
            text = if (state.isLoading) "SENDING OTP..." else "CONTINUE",
            onClick = { viewModel.requestOtp(onOtpRequested) },
            enabled = state.mobileNumber.length == 10 && !state.isLoading,
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(16.dp))
        SecondaryButton(
            text = "CONTINUE AS GUEST",
            onClick = viewModel::continueAsGuest,
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
