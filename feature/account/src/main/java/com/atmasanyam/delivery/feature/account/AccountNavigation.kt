package com.atmasanyam.delivery.feature.account

import androidx.compose.runtime.State
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.atmasanyam.delivery.core.model.AccountState
import com.atmasanyam.delivery.core.navigation.Destination

/**
 * Every screen behind the hamburger menu and Settings. Screens that need an account show a
 * "Sign in" prompt to guests; [onSignIn] starts the existing mobile-number + code flow and
 * returns here afterwards.
 */
fun NavGraphBuilder.accountGraph(
    account: State<AccountState>,
    actions: AccountActions,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenFavoriteLocations: () -> Unit,
    onOpenDeleteAccount: () -> Unit,
    onLoggedOut: () -> Unit,
    onAccountDeleted: () -> Unit,
) {
    composable(Destination.Profile.route) {
        ProfileScreen(
            account = account.value,
            onNameSaved = actions.updateDisplayName,
            onBack = onBack,
            onSignIn = onSignIn,
        )
    }
    composable(Destination.Help.route) {
        HelpScreen(onBack = onBack)
    }
    composable(Destination.BookingHistory.route) {
        BookingHistoryScreen(account = account.value, onBack = onBack, onSignIn = onSignIn)
    }
    composable(Destination.Safety.route) {
        SafetyScreen(onBack = onBack)
    }
    composable(Destination.ReferAndEarn.route) {
        ReferAndEarnScreen(account = account.value, onBack = onBack, onSignIn = onSignIn)
    }
    composable(Destination.MyRewards.route) {
        MyRewardsScreen(account = account.value, onBack = onBack, onSignIn = onSignIn)
    }
    composable(Destination.Notifications.route) {
        NotificationsScreen(
            account = account.value,
            onMarkAllRead = actions.markNotificationsRead,
            onClearAll = actions.clearNotifications,
            onBack = onBack,
            onSignIn = onSignIn,
        )
    }
    composable(Destination.Settings.route) {
        SettingsScreen(
            isSignedIn = account.value.isSignedIn,
            onOpenProfile = onOpenProfile,
            onOpenFavoriteLocations = onOpenFavoriteLocations,
            onLogoutConfirmed = {
                actions.signOut()
                onLoggedOut()
            },
            onOpenDeleteAccount = onOpenDeleteAccount,
            onBack = onBack,
            onSignIn = onSignIn,
        )
    }
    composable(Destination.FavoriteLocations.route) {
        FavoriteLocationsScreen(
            account = account.value,
            onAdd = actions.addFavorite,
            onRemove = actions.removeFavorite,
            onBack = onBack,
            onSignIn = onSignIn,
        )
    }
    composable(Destination.DeleteAccount.route) {
        DeleteAccountScreen(
            isSignedIn = account.value.isSignedIn,
            onDeleteAccount = actions.deleteAccount,
            onDeleted = onAccountDeleted,
            onBack = onBack,
            onSignIn = onSignIn,
        )
    }
}
