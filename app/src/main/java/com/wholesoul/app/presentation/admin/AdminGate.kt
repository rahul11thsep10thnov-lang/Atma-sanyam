package com.wholesoul.app.presentation.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar

/**
 * Wraps every Admin Console page: shows [content] once the PIN has been entered, and the PIN
 * screen until then.
 */
@Composable
fun AdminGate(
    onBack: () -> Unit,
    viewModel: AdminGateViewModel = hiltViewModel(),
    content: @Composable () -> Unit,
) {
    val unlocked by viewModel.isUnlocked.collectAsState()
    if (unlocked) {
        content()
    } else {
        val state by viewModel.uiState.collectAsState()
        AdminPinScreen(
            state = state,
            onBack = onBack,
            onPinChange = viewModel::onPinChange,
            onConfirmChange = viewModel::onConfirmPinChange,
            onSubmit = viewModel::submit,
        )
    }
}

@Composable
private fun AdminPinScreen(
    state: AdminGateUiState,
    onBack: () -> Unit,
    onPinChange: (String) -> Unit,
    onConfirmChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Admin Console", onBack = onBack)
        if (state.mode == GateMode.CHECKING) {
            Box(Modifier.fillMaxSize())
            return@Column
        }
        val creating = state.mode == GateMode.CREATE_PIN
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Top,
        ) {
            Spacer(Modifier.height(24.dp))
            Icon(Icons.Filled.Lock, contentDescription = null, tint = WholesoulColors.Leaf, modifier = Modifier.size(48.dp))
            Spacer(Modifier.height(16.dp))
            Text(
                if (creating) "Create an admin PIN" else "Enter your admin PIN",
                style = MaterialTheme.typography.titleLarge,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                if (creating) {
                    "Choose ${AdminGateViewModel.MIN_PIN}-${AdminGateViewModel.MAX_PIN} digits. You'll need it every time you open the Admin Console on this phone."
                } else {
                    "Only the shop owner should be able to change items and prices."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = WholesoulColors.TextSecondary,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            OutlinedTextField(
                value = state.pin,
                onValueChange = onPinChange,
                label = { Text("PIN") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.NumberPassword,
                    imeAction = if (creating) ImeAction.Next else ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = { onSubmit() }),
                modifier = Modifier.fillMaxWidth(),
            )
            if (creating) {
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = state.confirmPin,
                    onValueChange = onConfirmChange,
                    label = { Text("Confirm PIN") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { onSubmit() }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (state.error != null) {
                Text(
                    state.error,
                    color = WholesoulColors.Error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            Spacer(Modifier.height(20.dp))
            PrimaryButton(
                text = if (creating) "CREATE PIN" else "UNLOCK",
                onClick = onSubmit,
                enabled = !state.isBusy && state.pin.length >= AdminGateViewModel.MIN_PIN,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
