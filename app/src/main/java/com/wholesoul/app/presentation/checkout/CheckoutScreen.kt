package com.wholesoul.app.presentation.checkout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.util.formatRupees
import com.wholesoul.app.domain.model.PaymentMethod

@Composable
fun CheckoutScreen(
    onBack: () -> Unit,
    onChangeAddress: () -> Unit,
    onOrderPlaced: (String) -> Unit,
    viewModel: CheckoutViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.placedOrderId) {
        state.placedOrderId?.let(onOrderPlaced)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Checkout", onBack = onBack)

        Column(modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp)) {
            SectionCard(title = "Deliver to") {
                if (state.selectedAddress != null) {
                    val address = state.selectedAddress!!
                    Column {
                        Text(
                            "${address.label.name} • ${address.fullName}",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            "${address.houseNumber}, ${address.buildingStreet}, ${address.area}, ${address.city} - ${address.pinCode}",
                            style = MaterialTheme.typography.bodySmall,
                            color = WholesoulColors.TextSecondary,
                        )
                    }
                } else {
                    Text("No address selected", style = MaterialTheme.typography.bodyMedium, color = WholesoulColors.Error)
                }
                TextButton(onClick = onChangeAddress) { Text("CHANGE") }
            }

            SectionCard(title = "Order summary") {
                state.cart.items.forEach { item ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${item.product.name} x${item.quantity}", style = MaterialTheme.typography.bodySmall)
                        Text(formatRupees(item.product.price * item.quantity), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            SectionCard(title = "Payment method") {
                PaymentMethod.entries.forEach { method ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = state.paymentMethod == method, onClick = { viewModel.selectPaymentMethod(method) })
                        Text(method.label, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            SectionCard(title = "Delivery instructions (optional)") {
                OutlinedTextField(
                    value = state.deliveryInstructions,
                    onValueChange = viewModel::onDeliveryInstructionsChange,
                    placeholder = { Text("E.g. Leave at the door") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            SectionCard(title = "Bill details") {
                BillLine("Item total", formatRupees(state.totals.itemTotal))
                BillLine("Delivery fee", if (state.totals.deliveryFee == 0.0) "FREE" else formatRupees(state.totals.deliveryFee))
                BillLine("Handling fee", formatRupees(state.totals.handlingFee))
                if (state.totals.couponDiscount > 0) BillLine("Coupon discount", "-${formatRupees(state.totals.couponDiscount)}")
                HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp))
                BillLine("Total", formatRupees(state.totals.grandTotal), emphasized = true)
            }

            state.errorMessage?.let {
                Text(it, color = WholesoulColors.Error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
            }
        }

        Surface(shadowElevation = 10.dp) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                PrimaryButton(
                    text = if (state.isPlacingOrder) "PLACING ORDER..." else "PLACE ORDER • ${formatRupees(state.totals.grandTotal)}",
                    onClick = viewModel::placeOrder,
                    enabled = !state.isPlacingOrder && state.selectedAddress != null && !state.cart.isEmpty,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(title, style = MaterialTheme.typography.titleSmall)
            }
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun BillLine(label: String, value: String, emphasized: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium)
        Text(value, style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium)
    }
}
