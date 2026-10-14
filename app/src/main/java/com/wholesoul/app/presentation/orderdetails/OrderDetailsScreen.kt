package com.wholesoul.app.presentation.orderdetails

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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.GenericErrorView
import com.wholesoul.app.core.designsystem.components.OrderStatusTimeline
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.SecondaryButton
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.core.util.formatRupees
import com.wholesoul.app.domain.model.Order
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun OrderDetailsScreen(
    onBack: () -> Unit,
    onGetHelp: () -> Unit,
    onReorderComplete: () -> Unit,
    viewModel: OrderDetailsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val actionMessage by viewModel.actionMessage.collectAsState()

    LaunchedEffect(actionMessage) {
        if (actionMessage == "Items added to your cart") {
            onReorderComplete()
            viewModel.clearActionMessage()
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        com.wholesoul.app.core.designsystem.components.WholesoulTopBar(title = "Order details", onBack = onBack)

        when (val state = uiState) {
            is UiState.Loading -> androidx.compose.foundation.layout.Box(Modifier.fillMaxSize())
            is UiState.Error -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Empty -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Success -> OrderDetailsContent(
                order = state.data,
                actionMessage = actionMessage,
                onCancel = viewModel::cancelOrder,
                onReorder = viewModel::reorder,
                onGetHelp = onGetHelp,
            )
        }
    }
}

@Composable
private fun OrderDetailsContent(
    order: Order,
    actionMessage: String?,
    onCancel: () -> Unit,
    onReorder: () -> Unit,
    onGetHelp: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Order #${order.orderNumber}", style = MaterialTheme.typography.titleLarge)
        Text(
            SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault()).format(Date(order.placedAtEpochMillis)),
            style = MaterialTheme.typography.bodySmall,
            color = WholesoulColors.TextSecondary,
        )

        SectionCard("Status") { OrderStatusTimeline(currentStatus = order.status) }

        SectionCard("Items") {
            order.items.forEach { item ->
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(item.productName, style = MaterialTheme.typography.bodyMedium)
                        Text("${item.unit} x ${item.quantity}", style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary)
                    }
                    Text(formatRupees(item.lineTotal), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        SectionCard("Delivery address") {
            val address = order.deliveryAddress
            Text(address.fullName, style = MaterialTheme.typography.bodyMedium)
            Text(
                "${address.houseNumber}, ${address.buildingStreet}, ${address.area}, ${address.city}, ${address.state} - ${address.pinCode}",
                style = MaterialTheme.typography.bodySmall,
                color = WholesoulColors.TextSecondary,
            )
        }

        SectionCard("Payment") {
            Text(order.paymentMethod.label, style = MaterialTheme.typography.bodyMedium)
        }

        SectionCard("Bill") {
            BillRow("Item total", formatRupees(order.itemTotal))
            BillRow("Delivery fee", if (order.deliveryFee == 0.0) "FREE" else formatRupees(order.deliveryFee))
            BillRow("Handling fee", formatRupees(order.handlingFee))
            if (order.discount > 0) BillRow("Discount", "-${formatRupees(order.discount)}")
            HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp))
            BillRow("Total", formatRupees(order.grandTotal), emphasized = true)
        }

        actionMessage?.let {
            Text(it, color = WholesoulColors.Error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
        }

        Spacer(Modifier.height(16.dp))
        if (order.isCancellable) {
            SecondaryButton(text = "CANCEL ORDER", onClick = onCancel, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
        }
        PrimaryButton(text = "REORDER", onClick = onReorder, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(10.dp))
        SecondaryButton(text = "GET HELP", onClick = onGetHelp, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun BillRow(label: String, value: String, emphasized: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium)
        Text(value, style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium)
    }
}
