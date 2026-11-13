package com.wholesoul.app.core.designsystem.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors

@Composable
fun EmptyStateView(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Filled.SearchOff,
    action: (@Composable () -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(PaddingValues(32.dp)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(icon, contentDescription = null, tint = WholesoulColors.TextTertiary, modifier = Modifier.height(56.dp))
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = WholesoulColors.TextSecondary,
            textAlign = TextAlign.Center,
        )
        if (action != null) {
            Spacer(Modifier.height(20.dp))
            action()
        }
    }
}

@Composable
fun NoInternetView(modifier: Modifier = Modifier, onRetry: () -> Unit) {
    EmptyStateView(
        title = "No internet connection",
        message = "Please check your internet connection and try again.",
        icon = Icons.Filled.CloudOff,
        modifier = modifier,
        action = { PrimaryButton(text = "RETRY", onClick = onRetry) },
    )
}

@Composable
fun GenericErrorView(modifier: Modifier = Modifier, onRetry: () -> Unit) {
    EmptyStateView(
        title = "Something went wrong",
        message = "We're unable to load this right now. Please try again.",
        icon = Icons.Filled.ErrorOutline,
        modifier = modifier,
        action = { PrimaryButton(text = "RETRY", onClick = onRetry) },
    )
}
