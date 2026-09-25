package com.wholesoul.app.presentation.cart

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.AddOrQuantitySelector
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulImage
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.core.util.formatRupees
import com.wholesoul.app.domain.model.CartItem

@Composable
fun CartScreen(
    onBrowseProducts: () -> Unit,
    onCheckout: () -> Unit,
    viewModel: CartViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val imageProvider = LocalImageProvider.current

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "My Cart")

        if (state.cart.isEmpty) {
            EmptyStateView(
                title = "Your cart is empty",
                message = "Looks like you haven't added anything yet.",
                icon = androidx.compose.material.icons.Icons.Filled.LocalShipping,
                action = { PrimaryButton(text = "BROWSE PRODUCTS", onClick = onBrowseProducts) },
            )
            return@Column
        }

        LazyColumn(modifier = Modifier.weight(1f)) {
            items(state.cart.items, key = { it.product.id }) { item ->
                CartItemRow(
                    item = item,
                    imageModel = imageProvider.resolve(item.product.imageKey),
                    onIncrement = { viewModel.increment(item.product.id) },
                    onDecrement = { viewModel.decrement(item.product.id) },
                    onRemove = { viewModel.remove(item.product.id) },
                )
            }

            if (!state.totals.qualifiesForFreeDelivery) {
                item {
                    Surface(color = WholesoulColors.LeafLight, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "Add ${formatRupees(state.totals.amountToUnlockFreeDelivery)} more to unlock free delivery",
                            style = MaterialTheme.typography.bodySmall,
                            color = WholesoulColors.LeafDark,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                }
            }

            item { CouponSection(state, viewModel::onCouponInputChange, viewModel::applyCoupon, viewModel::removeCoupon) }
            item { BillDetailsSection(state) }
        }

        Surface(shadowElevation = 10.dp) {
            Column(modifier = Modifier.padding(16.dp)) {
                if (state.totals.totalSavings > 0) {
                    Text(
                        "You save ${formatRupees(state.totals.totalSavings)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = WholesoulColors.Success,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }
                PrimaryButton(
                    text = "PROCEED TO CHECKOUT • ${formatRupees(state.totals.grandTotal)}",
                    onClick = onCheckout,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun CartItemRow(
    item: CartItem,
    imageModel: Any,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    onRemove: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        WholesoulImage(
            model = imageModel,
            contentDescription = item.product.name,
            modifier = Modifier.size(64.dp).clip(RoundedCornerShape(10.dp)),
        )
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item.product.name, style = MaterialTheme.typography.bodyMedium, maxLines = 1)
            Text(item.product.weightLabel, style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary)
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                Text(formatRupees(item.product.price * item.quantity), style = MaterialTheme.typography.titleSmall)
                if (item.product.discountPercent > 0) {
                    Spacer(Modifier.width(6.dp))
                    Text(
                        formatRupees(item.product.mrp * item.quantity),
                        style = MaterialTheme.typography.bodySmall,
                        color = WholesoulColors.TextTertiary,
                        textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough,
                    )
                }
            }
        }
        AddOrQuantitySelector(quantity = item.quantity, onAdd = onIncrement, onIncrement = onIncrement, onDecrement = onDecrement)
        IconButton(onClick = onRemove) {
            Icon(Icons.Filled.Close, contentDescription = "Remove", tint = WholesoulColors.TextTertiary)
        }
    }
    HorizontalDivider(color = WholesoulColors.Divider)
}

@Composable
private fun CouponSection(
    state: CartUiState,
    onInputChange: (String) -> Unit,
    onApply: () -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(12.dp),
        colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            val applied = state.cart.appliedCoupon
            if (applied != null) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(applied.code, style = MaterialTheme.typography.titleSmall, color = WholesoulColors.Leaf)
                        Text(applied.description, style = MaterialTheme.typography.bodySmall)
                    }
                    IconButton(onClick = onRemove) { Icon(Icons.Filled.Close, contentDescription = "Remove coupon") }
                }
            } else {
                Text("Apply coupon", style = MaterialTheme.typography.titleSmall)
                Row(modifier = Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = state.couponInput,
                        onValueChange = onInputChange,
                        placeholder = { Text("Enter coupon code") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(8.dp))
                    PrimaryButton(text = "APPLY", onClick = onApply, enabled = !state.isApplyingCoupon && state.couponInput.isNotBlank())
                }
                state.couponError?.let {
                    Text(it, color = WholesoulColors.Error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
    }
}

@Composable
private fun BillDetailsSection(state: CartUiState) {
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Text("Bill details", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(10.dp))
        BillRow("Item total", formatRupees(state.totals.itemTotal))
        BillRow("Delivery fee", if (state.totals.deliveryFee == 0.0) "FREE" else formatRupees(state.totals.deliveryFee))
        BillRow("Handling fee", formatRupees(state.totals.handlingFee))
        if (state.totals.couponDiscount > 0) BillRow("Coupon discount", "-${formatRupees(state.totals.couponDiscount)}")
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        BillRow("Total", formatRupees(state.totals.grandTotal), emphasized = true)
    }
}

@Composable
private fun BillRow(label: String, value: String, emphasized: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium)
        Text(value, style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium)
    }
}
