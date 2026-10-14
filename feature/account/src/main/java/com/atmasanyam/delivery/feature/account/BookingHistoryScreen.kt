package com.atmasanyam.delivery.feature.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.EmptyState
import com.atmasanyam.delivery.core.model.AccountState
import com.atmasanyam.delivery.core.model.BookingRecord
import com.atmasanyam.delivery.core.model.BookingStatus
import java.text.DateFormat
import java.util.Date

/** The user's placed bookings, newest first. */
@Composable
fun BookingHistoryScreen(
    account: AccountState,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    SignedInScreen(
        title = stringResource(R.string.account_history_title),
        isSignedIn = account.isSignedIn,
        onBack = onBack,
        onSignIn = onSignIn,
        modifier = modifier,
    ) { padding ->
        if (account.bookings.isEmpty()) {
            EmptyState(
                icon = Icons.Outlined.History,
                title = stringResource(R.string.account_history_empty_title),
                message = stringResource(R.string.account_history_empty_message),
                modifier = Modifier.padding(padding),
            )
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(account.bookings, key = { it.bookingId }) { booking -> BookingCard(booking) }
            }
        }
    }
}

@Composable
private fun BookingCard(booking: BookingRecord) {
    val locale = LocalConfiguration.current.locales[0]
    val date = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT, locale)
        .format(Date(booking.createdAtEpochMillis))
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(text = booking.bookingId, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    text = statusLabel(booking.status),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text(
                text = date,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = stringResource(R.string.account_history_route, booking.pickupAddress, booking.destinationAddress),
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 8.dp),
            )
            Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(text = booking.vehicleName, style = MaterialTheme.typography.bodyMedium)
                booking.totalFare?.let {
                    Text(text = stringResource(R.string.account_fare_value, it), style = MaterialTheme.typography.titleSmall)
                }
            }
        }
    }
}

@Composable
private fun statusLabel(status: BookingStatus): String = stringResource(
    when (status) {
        BookingStatus.SEARCHING -> R.string.account_status_searching
        BookingStatus.DELIVERED -> R.string.account_status_delivered
        BookingStatus.CANCELLED, BookingStatus.FAILED, BookingStatus.EXPIRED -> R.string.account_status_closed
        else -> R.string.account_status_in_progress
    },
)
