package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.EmptyState
import com.atmasanyam.delivery.core.model.AccountState
import com.atmasanyam.delivery.core.model.InAppNotification
import com.atmasanyam.delivery.core.model.NotificationType
import java.text.DateFormat
import java.util.Date

/** In-app notifications, newest first. Opening the screen marks them as read. */
@Composable
fun NotificationsScreen(
    account: AccountState,
    onMarkAllRead: () -> Unit,
    onClearAll: () -> Unit,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentOnMarkAllRead = rememberUpdatedState(onMarkAllRead)
    // Opening the screen counts as reading everything on it.
    LaunchedEffect(account.isSignedIn) {
        if (account.isSignedIn) currentOnMarkAllRead.value()
    }

    SignedInScreen(
        title = stringResource(R.string.account_notifications_title),
        isSignedIn = account.isSignedIn,
        onBack = onBack,
        onSignIn = onSignIn,
        modifier = modifier,
        actions = {
            if (account.notifications.isNotEmpty()) {
                TextButton(onClick = onClearAll) { Text(stringResource(R.string.account_notifications_clear)) }
            }
        },
    ) { padding ->
        if (account.notifications.isEmpty()) {
            EmptyState(
                icon = Icons.Outlined.NotificationsNone,
                title = stringResource(R.string.account_notifications_empty_title),
                message = stringResource(R.string.account_notifications_empty_message),
                modifier = Modifier.padding(padding),
            )
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(account.notifications, key = { it.id }) { notification -> NotificationCard(notification) }
            }
        }
    }
}

@Composable
private fun NotificationCard(notification: InAppNotification) {
    val locale = LocalConfiguration.current.locales[0]
    val date = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT, locale)
        .format(Date(notification.createdAtEpochMillis))
    val bookingId = notification.bookingId.orEmpty()
    val (title, body) = when (notification.type) {
        NotificationType.BOOKING_CONFIRMED ->
            stringResource(R.string.account_notification_confirmed_title) to
                stringResource(R.string.account_notification_confirmed_body, bookingId)
        else ->
            stringResource(R.string.account_notification_update_title) to
                stringResource(R.string.account_notification_update_body, bookingId)
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = if (notification.read) FontWeight.Normal else FontWeight.Bold,
            )
            Text(text = body, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
            Text(
                text = date,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}
