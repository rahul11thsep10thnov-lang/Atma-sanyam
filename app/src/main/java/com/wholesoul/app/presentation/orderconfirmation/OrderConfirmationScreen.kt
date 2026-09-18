package com.wholesoul.app.presentation.orderconfirmation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
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

@Composable
fun OrderConfirmationScreen(
    onTrackOrder: (String) -> Unit,
    onContinueShopping: () -> Unit,
    viewModel: OrderConfirmationViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    when (val state = uiState) {
        is UiState.Loading -> androidx.compose.foundation.layout.Box(Modifier.fillMaxSize())
        is UiState.Error -> GenericErrorView(onRetry = onContinueShopping)
        is UiState.Empty -> GenericErrorView(onRetry = onContinueShopping)
        is UiState.Success -> {
            val order = state.data
            Column(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Spacer(Modifier.height(24.dp))
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier.size(72.dp).background(WholesoulColors.LeafLight, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = WholesoulColors.Leaf, modifier = Modifier.size(40.dp))
                }
                Spacer(Modifier.height(16.dp))
                Text("Order placed successfully!", style = MaterialTheme.typography.headlineSmall)
                Text("Order #${order.orderNumber}", style = MaterialTheme.typography.bodyMedium, color = WholesoulColors.TextSecondary)
                Text(order.estimatedDeliveryLabel, style = MaterialTheme.typography.bodyMedium, color = WholesoulColors.Leaf, modifier = Modifier.padding(top = 4.dp))

                Card(
                    modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                    colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Order summary", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(8.dp))
                        order.items.forEach { item ->
                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("${item.productName} x${item.quantity}", style = MaterialTheme.typography.bodySmall)
                                Text(formatRupees(item.lineTotal), style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total paid", style = MaterialTheme.typography.titleSmall)
                            Text(formatRupees(order.grandTotal), style = MaterialTheme.typography.titleSmall)
                        }
                    }
                }

                Card(
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        OrderStatusTimeline(currentStatus = order.status)
                    }
                }

                Spacer(Modifier.height(24.dp))
                PrimaryButton(text = "TRACK ORDER", onClick = { onTrackOrder(order.id) }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(12.dp))
                SecondaryButton(text = "CONTINUE SHOPPING", onClick = onContinueShopping, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}
