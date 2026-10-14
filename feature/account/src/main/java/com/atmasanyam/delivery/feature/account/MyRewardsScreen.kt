package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.atmasanyam.delivery.core.designsystem.components.EmptyState
import com.atmasanyam.delivery.core.model.AccountState

/**
 * Rewards the user has earned. There is no rewards programme or backend yet, so this honestly
 * shows that nothing has been earned rather than inventing a balance.
 */
@Composable
fun MyRewardsScreen(
    account: AccountState,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    SignedInScreen(
        title = stringResource(R.string.account_rewards_title),
        isSignedIn = account.isSignedIn,
        onBack = onBack,
        onSignIn = onSignIn,
        modifier = modifier,
    ) { padding ->
        EmptyState(
            icon = Icons.Outlined.EmojiEvents,
            title = stringResource(R.string.account_rewards_empty_title),
            message = stringResource(R.string.account_rewards_empty_message),
            modifier = Modifier.padding(padding),
        )
    }
}
