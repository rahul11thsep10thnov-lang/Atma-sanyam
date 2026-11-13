package com.wholesoul.app.core.designsystem.components

import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.wholesoul.app.core.designsystem.WholesoulColors

@Composable
fun WholesoulFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        modifier = modifier,
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = WholesoulColors.LeafLight,
            selectedLabelColor = WholesoulColors.LeafDark,
        ),
    )
}

@Composable
fun StockBadge(inStock: Boolean, modifier: Modifier = Modifier) {
    if (inStock) return
    Text(
        text = "OUT OF STOCK",
        style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
        color = WholesoulColors.Error,
        modifier = modifier,
    )
}

@Composable
fun RatingBadge(rating: Float, reviewCount: Int, modifier: Modifier = Modifier) {
    androidx.compose.foundation.layout.Row(modifier = modifier) {
        Text(
            text = "★ $rating",
            style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
            color = WholesoulColors.Rating,
        )
        if (reviewCount > 0) {
            Text(
                text = " ($reviewCount)",
                style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
                color = WholesoulColors.TextTertiary,
            )
        }
    }
}
