package com.atmasanyam.delivery.feature.account

import com.atmasanyam.delivery.core.model.SavedAddressLabel

/**
 * Everything the account screens can change, as plain lambdas, so this module never depends on
 * core:data (the app module backs these with its AccountViewModel).
 */
class AccountActions(
    val updateDisplayName: (String) -> Unit,
    val addFavorite: (SavedAddressLabel, String) -> Unit,
    val removeFavorite: (String) -> Unit,
    val markNotificationsRead: () -> Unit,
    val clearNotifications: () -> Unit,
    /** Ends the session only; account data is kept. */
    val signOut: () -> Unit,
    /** Erases the account's data; returns false if it could not be erased. */
    val deleteAccount: () -> Boolean,
)
