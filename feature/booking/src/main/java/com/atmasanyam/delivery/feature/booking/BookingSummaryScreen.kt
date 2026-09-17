package com.atmasanyam.delivery.feature.booking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.ComingSoonScreen
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.designsystem.components.SectionHeader
import com.atmasanyam.delivery.core.model.BookingFlowState

@Composable
fun BookingSummaryScreen(
    bookingFlowState: State<BookingFlowState>,
    onBookDelivery: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state = bookingFlowState.value
    val pickup = state.pickup
    val destination = state.destination
    val goods = state.goodsDetails
    val vehicleQuote = state.selectedVehicleQuote
    val breakdown = vehicleQuote?.priceBreakdown

    if (pickup == null || destination == null || goods == null || vehicleQuote == null || breakdown == null) {
        ComingSoonScreen(
            title = "Missing details",
            description = "Please go back and complete the previous steps first.",
            modifier = modifier,
        ) {
            SecondaryButton(text = "Back", onClick = onBack)
        }
        return
    }

    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            SectionHeader(title = "Confirm your delivery")

            SummaryRow(label = "Pickup", value = pickup.addressLine)
            SummaryRow(label = "Destination", value = destination.addressLine)
            SummaryRow(label = "Goods", value = goods.categories.joinToString { it.displayName })
            if (goods.description.isNotBlank()) {
                SummaryRow(label = "Description", value = goods.description)
            }
            SummaryRow(label = "Quantity", value = "${goods.quantity}")
            SummaryRow(label = "Weight", value = "${goods.approxWeightKg} kg")
            val dims = goods.largestItemDimensions
            SummaryRow(
                label = "Dimensions",
                value = "${dims.length} x ${dims.width} x ${dims.height} ${dims.unit.name.lowercase()}",
            )
            SummaryRow(label = "Vehicle", value = vehicleQuote.vehicle.name)
            SummaryRow(label = "ETA", value = "${vehicleQuote.etaMinutes} min")

            Card(modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Price breakdown", style = MaterialTheme.typography.titleMedium)
                    PriceRow("Base fare", breakdown.baseFare)
                    PriceRow("Distance charge", breakdown.distanceCharge)
                    if (breakdown.loadingFee > 0) PriceRow("Loading fee", breakdown.loadingFee)
                    if (breakdown.waitingFee > 0) PriceRow("Waiting fee", breakdown.waitingFee)
                    if (breakdown.heavyWeightSurcharge > 0) PriceRow("Heavy item surcharge", breakdown.heavyWeightSurcharge)
                    PriceRow("Platform fee", breakdown.platformFee)
                    PriceRow("Tax", breakdown.tax)
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(text = "Estimated total", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(
                            text = "₹%.0f".format(breakdown.total),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }

            PrimaryButton(text = "Book delivery", onClick = onBookDelivery, modifier = Modifier.padding(top = 20.dp))
            SecondaryButton(text = "Back", onClick = onBack, modifier = Modifier.padding(top = 12.dp, bottom = 8.dp))
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun PriceRow(label: String, amount: Double) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium)
        Text(text = "₹%.0f".format(amount), style = MaterialTheme.typography.bodyMedium)
    }
}
