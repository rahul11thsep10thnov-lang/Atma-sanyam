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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.ComingSoonScreen
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.designsystem.components.SectionHeader
import com.atmasanyam.delivery.core.designsystem.labels.labelRes
import com.atmasanyam.delivery.core.designsystem.labels.localizedName
import com.atmasanyam.delivery.core.designsystem.labels.shortLabelRes
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
            title = stringResource(R.string.booking_missing_title),
            description = stringResource(R.string.booking_missing_body),
            modifier = modifier,
        ) {
            SecondaryButton(text = stringResource(R.string.booking_back), onClick = onBack)
        }
        return
    }

    // Built before use because composable calls aren't allowed inside non-inline lambdas.
    val categoryNames = goods.categories.map { stringResource(it.labelRes()) }
    val dims = goods.largestItemDimensions

    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            SectionHeader(title = stringResource(R.string.booking_confirm_title))

            SummaryRow(label = stringResource(R.string.booking_row_pickup), value = pickup.addressLine)
            SummaryRow(label = stringResource(R.string.booking_row_destination), value = destination.addressLine)
            SummaryRow(label = stringResource(R.string.booking_row_goods), value = categoryNames.joinToString(", "))
            if (goods.description.isNotBlank()) {
                SummaryRow(label = stringResource(R.string.booking_row_description), value = goods.description)
            }
            SummaryRow(label = stringResource(R.string.booking_row_quantity), value = "${goods.quantity}")
            SummaryRow(
                label = stringResource(R.string.booking_row_weight),
                value = stringResource(R.string.booking_weight_value, formatNumber(goods.approxWeightKg)),
            )
            SummaryRow(
                label = stringResource(R.string.booking_row_dimensions),
                value = stringResource(
                    R.string.booking_dimensions_value,
                    formatNumber(dims.length),
                    formatNumber(dims.width),
                    formatNumber(dims.height),
                    stringResource(dims.unit.shortLabelRes()),
                ),
            )
            SummaryRow(label = stringResource(R.string.booking_row_vehicle), value = vehicleQuote.vehicle.localizedName())
            SummaryRow(
                label = stringResource(R.string.booking_row_eta),
                value = stringResource(R.string.booking_eta_value, vehicleQuote.etaMinutes),
            )

            Card(modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = stringResource(R.string.booking_price_breakdown), style = MaterialTheme.typography.titleMedium)
                    PriceRow(stringResource(R.string.booking_base_fare), breakdown.baseFare)
                    PriceRow(stringResource(R.string.booking_distance_charge), breakdown.distanceCharge)
                    if (breakdown.loadingFee > 0) PriceRow(stringResource(R.string.booking_loading_fee), breakdown.loadingFee)
                    if (breakdown.waitingFee > 0) PriceRow(stringResource(R.string.booking_waiting_fee), breakdown.waitingFee)
                    if (breakdown.heavyWeightSurcharge > 0) {
                        PriceRow(stringResource(R.string.booking_heavy_surcharge), breakdown.heavyWeightSurcharge)
                    }
                    PriceRow(stringResource(R.string.booking_platform_fee), breakdown.platformFee)
                    PriceRow(stringResource(R.string.booking_tax), breakdown.tax)
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            text = stringResource(R.string.booking_estimated_total),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "₹%.0f".format(breakdown.total),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }

            PrimaryButton(
                text = stringResource(R.string.booking_book),
                onClick = onBookDelivery,
                modifier = Modifier.padding(top = 20.dp),
            )
            SecondaryButton(
                text = stringResource(R.string.booking_back),
                onClick = onBack,
                modifier = Modifier.padding(top = 12.dp, bottom = 8.dp),
            )
        }
    }
}

/** 20.0 -> "20", 2.5 -> "2.5": whole numbers shouldn't carry a trailing ".0". */
private fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toLong().toString() else value.toString()

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
