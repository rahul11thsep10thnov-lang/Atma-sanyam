package com.atmasanyam.delivery.feature.vehicle

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.ComingSoonScreen
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.model.BookingFlowState
import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.model.PriceBreakdown
import com.atmasanyam.delivery.core.model.Route
import com.atmasanyam.delivery.core.model.VehicleQuote
import com.atmasanyam.delivery.core.model.engine.PricingEngine
import com.atmasanyam.delivery.core.model.engine.VehicleMatchingEngine
import com.atmasanyam.delivery.core.model.sample.SampleVehicleCatalog

@Composable
fun VehicleSelectionScreen(
    bookingFlowState: State<BookingFlowState>,
    onVehicleSelected: (VehicleQuote) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state = bookingFlowState.value
    val route = state.route
    val goodsDetails = state.goodsDetails

    if (route == null || goodsDetails == null) {
        ComingSoonScreen(
            title = "Missing details",
            description = "Please go back and fill in your pickup, destination and goods details first.",
            modifier = modifier,
        ) {
            SecondaryButton(text = "Back", onClick = onBack)
        }
        return
    }

    val quotes = remember(route, goodsDetails) { buildVehicleQuotes(route, goodsDetails) }
    val eligibleQuotes = quotes.filter { it.eligible }

    Scaffold(modifier = modifier) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            Text(
                text = "Available vehicles",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(16.dp),
            )
            if (eligibleQuotes.isEmpty()) {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        text = "Your items exceed our currently available vehicle capacities.",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    SecondaryButton(text = "Back", onClick = onBack, modifier = Modifier.padding(top = 16.dp))
                }
            } else {
                LazyColumn(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
                    items(quotes) { quote ->
                        VehicleQuoteCard(quote = quote, onSelect = { onVehicleSelected(quote) })
                    }
                }
                SecondaryButton(text = "Back", onClick = onBack, modifier = Modifier.padding(16.dp))
            }
        }
    }
}

private fun buildVehicleQuotes(route: Route, goodsDetails: GoodsDetails): List<VehicleQuote> {
    return VehicleMatchingEngine.findEligibleVehicles(goodsDetails, SampleVehicleCatalog.vehicles).map { (vehicle, eligibility) ->
        val breakdown: PriceBreakdown? = if (eligibility.eligible) {
            PricingEngine.calculate(route = route, goods = goodsDetails, rule = vehicle.pricingRule)
        } else {
            null
        }
        VehicleQuote(
            vehicle = vehicle,
            eligible = eligibility.eligible,
            ineligibilityReason = eligibility.reason,
            priceBreakdown = breakdown,
            etaMinutes = (vehicle.etaMinutesRange.first + vehicle.etaMinutesRange.last) / 2,
        )
    }
}

@Composable
private fun VehicleQuoteCard(quote: VehicleQuote, onSelect: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(text = quote.vehicle.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (quote.eligible && quote.priceBreakdown != null) {
                    Text(
                        text = "₹%.0f".format(quote.priceBreakdown.total),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            Text(
                text = "Suitable for: ${quote.vehicle.description}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(
                text = "Capacity: up to ${quote.vehicle.capacity.maxWeightKg.toInt()} kg",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (quote.eligible) {
                Text(
                    text = "ETA: ${quote.etaMinutes} min",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                PrimaryButton(text = "Select", onClick = onSelect, modifier = Modifier.padding(top = 12.dp))
            } else {
                Text(
                    text = quote.ineligibilityReason
                        ?: "This vehicle may not be suitable for your items. Please select a larger vehicle.",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}
