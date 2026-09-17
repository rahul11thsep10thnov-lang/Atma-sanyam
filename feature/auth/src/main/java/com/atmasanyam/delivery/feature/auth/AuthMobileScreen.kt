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
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            SectionHeader(
                title = "Enter your mobile number",
                subtitle = "We'll send a verification code to confirm it's you.",
            )
            OutlinedTextField(
                value = phoneNumber,
                onValueChange = { input ->
                    phoneNumber = input.filter { it.isDigit() }.take(10)
                    errorMessage = null
                },
                label = { Text("Mobile number") },
                placeholder = { Text("98765 43210") },
                prefix = { Text("+91 ") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
            )
            if (errorMessage != null) {
                Text(
                    text = errorMessage.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            PrimaryButton(
                text = "Send code",
                onClick = {
                    if (phoneNumber.length == 10) {
                        onCodeSent(phoneNumber)
                    } else {
                        errorMessage = "Please enter a valid 10-digit mobile number."
                    }
                },
                modifier = Modifier.padding(top = 20.dp),
            )
            SecondaryButton(text = "Back", onClick = onBack, modifier = Modifier.padding(top = 12.dp))
        }
    }
}
