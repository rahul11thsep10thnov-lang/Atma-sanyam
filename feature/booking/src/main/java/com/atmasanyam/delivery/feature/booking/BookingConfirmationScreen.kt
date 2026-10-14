package com.atmasanyam.delivery.feature.booking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.labels.localizedName
import com.atmasanyam.delivery.core.model.BookingFlowState

@Composable
fun BookingConfirmationScreen(
    bookingFlowState: State<BookingFlowState>,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state = bookingFlowState.value
    // A real booking ID comes from the backend at booking time (Phase 12); until then the id is
    // a client-side placeholder created when the booking was placed (see BookingFlowViewModel).
    val bookingId = state.confirmedBooking?.bookingId.orEmpty()

    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 16.dp),
            )
            Text(text = stringResource(R.string.booking_confirmed), style = MaterialTheme.typography.titleLarge)
            Text(
                text = bookingId,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            )
            state.selectedVehicleQuote?.let { vehicleQuote ->
                Text(
                    text = stringResource(R.string.booking_status_searching, vehicleQuote.vehicle.localizedName()),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = stringResource(R.string.booking_confirmation_note),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 12.dp, bottom = 24.dp),
            )
            PrimaryButton(text = stringResource(R.string.booking_back_home), onClick = onDone)
        }
    }
}
