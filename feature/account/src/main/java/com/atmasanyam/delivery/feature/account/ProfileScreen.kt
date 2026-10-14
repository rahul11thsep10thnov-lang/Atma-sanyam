package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.model.AccountState
import kotlinx.coroutines.launch

private const val MAX_NAME_LENGTH = 50

/** View and update the profile. The mobile number is the sign-in identity, so it is shown but not editable. */
@Composable
fun ProfileScreen(
    account: AccountState,
    onNameSaved: (String) -> Unit,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var name by remember(account.displayName) { mutableStateOf(account.displayName) }
    var showError by remember { mutableStateOf(false) }
    val savedMessage = stringResource(R.string.account_profile_saved)

    SignedInScreen(
        title = stringResource(R.string.account_profile_title),
        isSignedIn = account.isSignedIn,
        onBack = onBack,
        onSignIn = onSignIn,
        modifier = modifier,
        snackbarHostState = snackbarHostState,
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = {
                    name = it.take(MAX_NAME_LENGTH)
                    showError = false
                },
                label = { Text(stringResource(R.string.account_profile_name)) },
                singleLine = true,
                isError = showError,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                modifier = Modifier.fillMaxWidth(),
            )
            if (showError) {
                Text(
                    text = stringResource(R.string.account_profile_name_error),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            OutlinedTextField(
                value = stringResource(R.string.account_profile_phone_value, account.phoneNumber.orEmpty()),
                onValueChange = {},
                label = { Text(stringResource(R.string.account_profile_phone)) },
                readOnly = true,
                enabled = false,
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
            )
            Text(
                text = stringResource(R.string.account_profile_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
            )
            PrimaryButton(
                text = stringResource(R.string.account_profile_save),
                enabled = name.trim() != account.displayName,
                onClick = {
                    if (name.isBlank()) {
                        showError = true
                    } else {
                        onNameSaved(name)
                        scope.launch { snackbarHostState.showSnackbar(savedMessage) }
                    }
                },
            )
        }
    }
}
