package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DeleteForever
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.MenuRow

/**
 * Exactly four settings: Profile, Favorite Locations, Logout, Delete Account.
 * Logout asks for confirmation first and only ends the session; Delete Account opens its own
 * confirmation screen and is never performed from here.
 */
@Composable
fun SettingsScreen(
    isSignedIn: Boolean,
    onOpenProfile: () -> Unit,
    onOpenFavoriteLocations: () -> Unit,
    onLogoutConfirmed: () -> Unit,
    onOpenDeleteAccount: () -> Unit,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showLogoutDialog by remember { mutableStateOf(false) }

    SignedInScreen(
        title = stringResource(R.string.account_settings_title),
        isSignedIn = isSignedIn,
        onBack = onBack,
        onSignIn = onSignIn,
        modifier = modifier,
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            MenuRow(
                icon = Icons.Outlined.Person,
                title = stringResource(R.string.account_settings_profile),
                onClick = onOpenProfile,
            )
            SettingsDivider()
            MenuRow(
                icon = Icons.Outlined.FavoriteBorder,
                title = stringResource(R.string.account_settings_favorites),
                onClick = onOpenFavoriteLocations,
            )
            SettingsDivider()
            MenuRow(
                icon = Icons.Outlined.Logout,
                title = stringResource(R.string.account_settings_logout),
                onClick = { showLogoutDialog = true },
            )
            SettingsDivider()
            MenuRow(
                icon = Icons.Outlined.DeleteForever,
                title = stringResource(R.string.account_settings_delete),
                onClick = onOpenDeleteAccount,
                contentColor = MaterialTheme.colorScheme.error,
                iconColor = MaterialTheme.colorScheme.error,
            )
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text(stringResource(R.string.account_logout_title)) },
            text = { Text(stringResource(R.string.account_logout_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogoutConfirmed()
                    },
                ) { Text(stringResource(R.string.account_logout_confirm)) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text(stringResource(R.string.account_cancel)) }
            },
        )
    }
}

@Composable
private fun SettingsDivider() {
    HorizontalDivider(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 60.dp, end = 20.dp),
        color = MaterialTheme.colorScheme.outlineVariant,
    )
}
