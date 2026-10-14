package com.wholesoul.app.presentation.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.domain.model.AppNotification
import com.wholesoul.app.domain.model.NotificationType
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val notifications by viewModel.notifications.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(
            title = "Notifications",
            onBack = onBack,
            actions = {
                TextButton(onClick = viewModel::markAllAsRead) { Text("MARK ALL READ") }
            },
        )

        if (notifications.isEmpty()) {
            EmptyStateView(title = "No notifications", message = "You're all caught up.", icon = Icons.Filled.NotificationsNone)
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(notifications, key = { it.id }) { notification ->
                    NotificationRow(notification, onClick = { viewModel.markAsRead(notification.id) })
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(notification: AppNotification, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.Top,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier.size(40.dp).clip(CircleShape).background(iconBackgroundFor(notification.type)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(iconFor(notification.type), contentDescription = null, tint = WholesoulColors.LeafDark, modifier = Modifier.size(20.dp))
        }
        Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
            Text(
                notification.title,
                style = if (notification.isRead) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.titleSmall,
            )
            Text(notification.message, style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary)
            Text(
                SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()).format(Date(notification.createdAtEpochMillis)),
                style = MaterialTheme.typography.labelSmall,
                color = WholesoulColors.TextTertiary,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        if (!notification.isRead) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier.size(8.dp).clip(CircleShape).background(WholesoulColors.Discount),
            )
        }
    }
    HorizontalDivider(color = WholesoulColors.Divider)
}

private fun iconFor(type: NotificationType) = when (type) {
    NotificationType.ORDER_UPDATE -> Icons.Filled.LocalShipping
    NotificationType.OFFER -> Icons.Filled.LocalOffer
    NotificationType.ARRIVAL -> Icons.Filled.Spa
    NotificationType.GENERAL -> Icons.Filled.NotificationsNone
}

private fun iconBackgroundFor(type: NotificationType) = WholesoulColors.LeafLight
