package com.atmasanyam.delivery.feature.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.designsystem.components.SectionHeader

/**
 * The code is alphanumeric (A-Z, a-z, 0-9), e.g. "A7K92B" - not a numeric-only OTP. Real
 * verification against POST /auth/verify-code, with server-side attempt limiting, is Phase 12;
 * this screen only validates the client-side shape (6 characters) before "verifying".
 */
@Composable
fun AuthVerifyCodeScreen(
    phoneNumber: String,
    onVerified: (phoneNumber: String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var code by remember { mutableStateOf("") }
    var showError by remember { mutableStateOf(false) }

    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            SectionHeader(
                title = stringResource(R.string.auth_code_title),
                subtitle = if (phoneNumber.isNotBlank()) {
                    stringResource(R.string.auth_code_sent_to, phoneNumber)
                } else {
                    stringResource(R.string.auth_code_generic)
                },
            )
            OutlinedTextField(
                value = code,
                onValueChange = {
                    code = it.filter { c -> c.isLetterOrDigit() }.take(6)
                    showError = false
                },
                label = { Text(stringResource(R.string.auth_code_label)) },
                placeholder = { Text(stringResource(R.string.auth_code_placeholder)) },
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
            )
            if (showError) {
                Text(
                    text = stringResource(R.string.auth_code_error),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            PrimaryButton(
                text = stringResource(R.string.auth_verify),
                onClick = {
                    if (code.length == 6) {
                        onVerified(phoneNumber)
                    } else {
                        showError = true
                    }
                },
                modifier = Modifier.padding(top = 20.dp),
            )
            SecondaryButton(
                text = stringResource(R.string.auth_back),
                onClick = onBack,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }
}
