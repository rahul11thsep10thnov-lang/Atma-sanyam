package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.atmasanyam.delivery.core.designsystem.components.EmptyState
import com.atmasanyam.delivery.core.designsystem.components.LokrathScreen
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton

/**
 * Frame for a screen that only makes sense for a signed-in user. A guest sees a "Sign in to
 * continue" prompt instead of [content]; signing in returns them here.
 */
@Composable
internal fun SignedInScreen(
    title: String,
    isSignedIn: Boolean,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
    snackbarHostState: SnackbarHostState? = null,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    LokrathScreen(
        title = title,
        onBack = onBack,
        modifier = modifier,
        snackbarHostState = snackbarHostState,
        actions = actions,
    ) { padding ->
        if (isSignedIn) {
            content(padding)
        } else {
            Column(modifier = Modifier.padding(padding)) {
                EmptyState(
                    icon = Icons.Outlined.Person,
                    title = stringResource(R.string.account_sign_in_title),
                    message = stringResource(R.string.account_sign_in_message),
                    action = {
                        PrimaryButton(text = stringResource(R.string.account_sign_in_button), onClick = onSignIn)
                    },
                )
            }
        }
    }
}
