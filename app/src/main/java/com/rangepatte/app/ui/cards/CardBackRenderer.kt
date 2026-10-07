package com.rangepatte.app.ui.cards

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset

/**
 * The back of every card in the app: burgundy, antique gold and a lotus medallion, handcrafted in
 * the manner of Mughal/Rajasthani ornament and drawn in code (see [drawRoyalCardBack]). The same
 * back is used by every game.
 */
@Composable
internal fun CardBack(palette: CardPalette, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) {
        drawRoyalCardBack(Offset.Zero, size)
    }
}
