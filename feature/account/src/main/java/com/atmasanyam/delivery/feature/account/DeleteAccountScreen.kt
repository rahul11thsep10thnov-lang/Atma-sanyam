package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import kotlinx.coroutines.launch

/**
 * Deleting an account takes three deliberate steps: read the consequences, tick the
 * acknowledgement, then confirm in a final dialog. [onDeleteAccount] is only ever called from
 * that dialog's confirm button, and [onDeleted] only runs if it reports success.
 *
 * Today the account lives on this device only, so "deleted" means erased from this device; the
 * screen says so plainly. Removing server-side data needs the backend (Phase 12).
 */
@Composable
fun DeleteAccountScreen(
    isSignedIn: Boolean,
    onDeleteAccount: () -> Boolean,
    onDeleted: () -> Unit,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var acknowledged by remember { mutableStateOf(false) }
    var showConfirmDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val failureMessage = stringResource(R.string.account_delete_failed)

    SignedInScreen(
        title = stringResource(R.string.account_delete_title),
        isSignedIn = isSignedIn,
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
            Text(
                text = stringResource(R.string.account_delete_heading),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.error,
            )
            Text(
                text = stringResource(R.string.account_delete_intro),
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(top = 12.dp),
            )
            Text(
                text = stringResource(R.string.account_delete_consequences),
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(top = 12.dp),
            )
            Text(
                text = stringResource(R.string.account_delete_scope_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 12.dp),
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(checked = acknowledged, onCheckedChange = { acknowledged = it })
                Text(
                    text = stringResource(R.string.account_delete_acknowledge),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            Button(
                onClick = { showConfirmDialog = true },
                enabled = acknowledged,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
            ) {
                Text(stringResource(R.string.account_delete_button))
            }
            SecondaryButton(
                text = stringResource(R.string.account_cancel),
                onClick = onBack,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text(stringResource(R.string.account_delete_confirm_title)) },
            text = { Text(stringResource(R.string.account_delete_confirm_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showConfirmDialog = false
                        if (onDeleteAccount()) {
                            onDeleted()
                        } else {
                            scope.launch { snackbarHostState.showSnackbar(failureMessage) }
                        }
                    },
                ) {
                    Text(stringResource(R.string.account_delete_confirm_button), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) { Text(stringResource(R.string.account_cancel)) }
            },
        )
    }
}
