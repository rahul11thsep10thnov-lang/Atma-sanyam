package com.rangepatte.app.ui.cards

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * A visually stacked pile of face-down cards (a stock/draw pile). [count] controls how many
 * offset layers are drawn (capped for performance — a deck of 52 never needs 52 real layers).
 */
@Composable
fun CardStack(
    count: Int,
    cardWidth: Dp,
    cardHeight: Dp,
    modifier: Modifier = Modifier,
    style: CardStyle = CardStyle.CLASSICAL_IVORY,
    maxVisibleLayers: Int = 4,
    onClick: (() -> Unit)? = null
) {
    val palette = style.palette()
    val visibleLayers = count.coerceAtMost(maxVisibleLayers).coerceAtLeast(if (count > 0) 1 else 0)
    val layerOffset = 1.5.dp

    Box(modifier = modifier.size(width = cardWidth + layerOffset * visibleLayers, height = cardHeight + layerOffset * visibleLayers)) {
        for (layer in 0 until visibleLayers) {
            val isTopLayer = layer == visibleLayers - 1
            Box(
                modifier = Modifier
                    .offset(x = layerOffset * layer, y = layerOffset * layer)
                    .size(width = cardWidth, height = cardHeight)
                    .let { if (isTopLayer && onClick != null) it.clickable(onClick = onClick) else it }
            ) {
                CardBack(palette = palette)
            }
        }
    }
}
