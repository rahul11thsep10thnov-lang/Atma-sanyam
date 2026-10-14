package com.rangepatte.app.ui.cards

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset

/**
 * The back of every card in the app: the classic red lattice back with a small gold lotus medallion,
 * drawn in code (see [drawRoyalCardBack]). The same back is used by every game.
 */
@Composable
internal fun CardBack(palette: CardPalette, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) {
        drawRoyalCardBack(Offset.Zero, size)
    }
}

/** The card back as a plain composable, in red or [blue]; for previews and any screen that shows a deck. */
@Composable
fun CardBackArt(blue: Boolean = false, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) { drawRoyalCardBack(Offset.Zero, size, blue) }
}
