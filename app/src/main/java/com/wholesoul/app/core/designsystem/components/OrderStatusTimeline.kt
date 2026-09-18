package com.wholesoul.app.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.domain.model.DeliveryStatus

private val timelineOrder = listOf(
    DeliveryStatus.PLACED,
    DeliveryStatus.CONFIRMED,
    DeliveryStatus.PACKED,
    DeliveryStatus.OUT_FOR_DELIVERY,
    DeliveryStatus.DELIVERED,
)

/**
 * Order confirmed -> Packed -> Out for delivery -> Delivered. Deliberately has no map or
 * live-location step (spec section 17) — WHOLESOUL never shows a live map.
 */
@Composable
fun OrderStatusTimeline(currentStatus: DeliveryStatus, modifier: Modifier = Modifier) {
    if (currentStatus == DeliveryStatus.CANCELLED) {
        Text("This order was cancelled", color = WholesoulColors.Error, style = MaterialTheme.typography.titleSmall, modifier = modifier)
        return
    }
    val currentIndex = timelineOrder.indexOf(currentStatus)

    Column(modifier = modifier) {
        timelineOrder.forEachIndexed { index, status ->
            val isDone = index <= currentIndex
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (isDone) Icons.Filled.CheckCircle else Icons.Filled.Circle,
                    contentDescription = null,
                    tint = if (isDone) WholesoulColors.Leaf else WholesoulColors.Divider,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    status.label,
                    style = if (isDone) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium,
                    color = if (isDone) WholesoulColors.TextPrimary else WholesoulColors.TextTertiary,
                )
            }
            if (index != timelineOrder.lastIndex) {
                Box(
                    modifier = Modifier.width(20.dp).height(18.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier
                            .width(2.dp)
                            .height(18.dp)
                            .background(if (index < currentIndex) WholesoulColors.Leaf else WholesoulColors.Divider),
                    )
                }
            }
        }
    }
}
