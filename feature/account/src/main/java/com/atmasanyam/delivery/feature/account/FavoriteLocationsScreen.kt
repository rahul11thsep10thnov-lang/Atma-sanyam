package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.EmptyState
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.model.AccountState
import com.atmasanyam.delivery.core.model.FavoriteLocation
import com.atmasanyam.delivery.core.model.SavedAddressLabel

private const val MIN_ADDRESS_LENGTH = 3

/** Saved places the user reuses often; view, add and remove. */
@Composable
fun FavoriteLocationsScreen(
    account: AccountState,
    onAdd: (SavedAddressLabel, String) -> Unit,
    onRemove: (String) -> Unit,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showAddDialog by remember { mutableStateOf(false) }
    var pendingRemoval by remember { mutableStateOf<FavoriteLocation?>(null) }

    SignedInScreen(
        title = stringResource(R.string.account_favorites_title),
        isSignedIn = account.isSignedIn,
        onBack = onBack,
        onSignIn = onSignIn,
        modifier = modifier,
    ) { padding ->
        if (account.favorites.isEmpty()) {
            EmptyState(
                icon = Icons.Outlined.FavoriteBorder,
                title = stringResource(R.string.account_favorites_empty_title),
                message = stringResource(R.string.account_favorites_empty_message),
                modifier = Modifier.padding(padding),
                action = {
                    PrimaryButton(text = stringResource(R.string.account_favorites_add), onClick = { showAddDialog = true })
                },
            )
        } else {
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(account.favorites, key = { it.id }) { favorite ->
                        FavoriteCard(favorite = favorite, onRemove = { pendingRemoval = favorite })
                    }
                }
                PrimaryButton(
                    text = stringResource(R.string.account_favorites_add),
                    onClick = { showAddDialog = true },
                    modifier = Modifier.padding(20.dp),
                )
            }
        }
    }

    if (showAddDialog) {
        AddFavoriteDialog(
            onDismiss = { showAddDialog = false },
            onSave = { label, address ->
                onAdd(label, address)
                showAddDialog = false
            },
        )
    }

    pendingRemoval?.let { favorite ->
        AlertDialog(
            onDismissRequest = { pendingRemoval = null },
            title = { Text(stringResource(R.string.account_favorites_remove_title)) },
            text = { Text(favorite.address) },
            confirmButton = {
                TextButton(
                    onClick = {
                        onRemove(favorite.id)
                        pendingRemoval = null
                    },
                ) { Text(stringResource(R.string.account_favorites_remove)) }
            },
            dismissButton = {
                TextButton(onClick = { pendingRemoval = null }) { Text(stringResource(R.string.account_cancel)) }
            },
        )
    }
}

@Composable
private fun FavoriteCard(favorite: FavoriteLocation, onRemove: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(
            modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.Place, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Column(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
                Text(text = favorite.label.displayName(), style = MaterialTheme.typography.titleMedium)
                Text(
                    text = favorite.address,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onRemove) {
                Icon(Icons.Outlined.Delete, contentDescription = stringResource(R.string.account_favorites_remove))
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AddFavoriteDialog(onDismiss: () -> Unit, onSave: (SavedAddressLabel, String) -> Unit) {
    var label by remember { mutableStateOf(SavedAddressLabel.HOME) }
    var address by remember { mutableStateOf("") }
    var showError by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Filled.Add, contentDescription = null) },
        title = { Text(stringResource(R.string.account_favorites_add)) },
        text = {
            Column {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SavedAddressLabel.entries.forEach { option ->
                        FilterChip(
                            selected = option == label,
                            onClick = { label = option },
                            label = { Text(option.displayName()) },
                        )
                    }
                }
                OutlinedTextField(
                    value = address,
                    onValueChange = {
                        address = it
                        showError = false
                    },
                    label = { Text(stringResource(R.string.account_favorites_address)) },
                    isError = showError,
                    supportingText = if (showError) ({ Text(stringResource(R.string.account_favorites_address_error)) }) else null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (address.trim().length < MIN_ADDRESS_LENGTH) showError = true else onSave(label, address)
                },
            ) { Text(stringResource(R.string.account_save)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.account_cancel)) }
        },
    )
}

@Composable
private fun SavedAddressLabel.displayName(): String = stringResource(
    when (this) {
        SavedAddressLabel.HOME -> R.string.account_label_home
        SavedAddressLabel.WORK -> R.string.account_label_work
        SavedAddressLabel.SHOP -> R.string.account_label_shop
        SavedAddressLabel.OTHER -> R.string.account_label_other
    },
)
