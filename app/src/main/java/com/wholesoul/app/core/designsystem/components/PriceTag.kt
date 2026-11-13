package com.wholesoul.app.core.designsystem.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.util.formatRupees

@Composable
fun PriceTag(
    price: Double,
    mrp: Double,
    modifier: Modifier = Modifier,
) {
    Row(modifier = modifier) {
        Text(
            text = formatRupees(price),
            style = MaterialTheme.typography.titleMedium,
            color = WholesoulColors.TextPrimary,
        )
        if (mrp > price) {
            Spacer(Modifier.width(6.dp))
            Text(
                text = formatRupees(mrp),
                style = MaterialTheme.typography.bodySmall,
                color = WholesoulColors.TextTertiary,
                textDecoration = TextDecoration.LineThrough,
            )
        }
    }
}

@Composable
fun DiscountLabel(discountPercent: Int, modifier: Modifier = Modifier) {
    if (discountPercent <= 0) return
    Text(
        text = "$discountPercent% OFF",
        style = MaterialTheme.typography.labelSmall,
        color = WholesoulColors.Discount,
        modifier = modifier,
    )
}
