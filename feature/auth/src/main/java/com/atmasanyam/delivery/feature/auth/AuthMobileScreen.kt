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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.designsystem.components.SectionHeader

/**
 * Mobile-only identity, exactly as specified: no email field anywhere in this flow. The
 * "Send code" action here is a client-side stand-in for POST /auth/request-code (Phase 12),
 * which is also where real rate-limiting on code requests belongs - never client-enforced only.
 */
@Composable
fun AuthMobileScreen(
    onCodeSent: (phoneNumber: String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var phoneNumber by remember { mutableStateOf("") }
    var showError by remember { mutableStateOf(false) }

    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            SectionHeader(
                title = stringResource(R.string.auth_mobile_title),
                subtitle = stringResource(R.string.auth_mobile_subtitle),
            )
            OutlinedTextField(
                value = phoneNumber,
                onValueChange = { input ->
                    phoneNumber = input.filter { it.isDigit() }.take(10)
                    showError = false
                },
                label = { Text(stringResource(R.string.auth_mobile_label)) },
                placeholder = { Text(stringResource(R.string.auth_mobile_placeholder)) },
                prefix = { Text(stringResource(R.string.auth_mobile_prefix)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
            )
            if (showError) {
                Text(
                    text = stringResource(R.string.auth_mobile_error),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            PrimaryButton(
                text = stringResource(R.string.auth_send_code),
                onClick = {
                    if (phoneNumber.length == 10) {
                        onCodeSent(phoneNumber)
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
