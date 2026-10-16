package com.rangepatte.app.ui.board

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import com.rangepatte.app.ui.components.screenSizeDp
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The board games' table. The board itself takes [PORTRAIT_SHARE] of the screen's height in portrait
 * (the full width, stretched taller than square) and [LANDSCAPE_SHARE] of the screen's width in
 * landscape (the full height, stretched wider), as far as the room allows. Everything else shares what
 * is left: in portrait a row of plaques above the board and a row below with the die between the bottom
 * two; in landscape narrow plaques in a column at each side, the die in the right-hand one. The corner
 * order is 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left — where each player's yard is on screen.
 */
@Composable
fun BoardTableLayout(
    corners: List<CornerPlayer?>,
    pulse: Float,
    board: @Composable (Modifier) -> Unit,
    controls: @Composable (dieSize: Dp) -> Unit,
    modifier: Modifier = Modifier,
    /** Small buttons (Undo, table talk): between the top plaques in portrait, between the left ones in landscape. */
    extras: @Composable () -> Unit = {},
    below: @Composable () -> Unit = {}
) {
    val screen = screenSizeDp()
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val availW = maxWidth
        val availH = maxHeight
        val landscape = availW > availH * 1.15f
        if (landscape) {
            val sideMin = 70.dp
            val boardW = minOf(screen.width * LANDSCAPE_SHARE, availW - sideMin * 2)
            val side = (availW - boardW) / 2
            Row(modifier = Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                Column(
                    modifier = Modifier.width(side).fillMaxHeight().padding(start = 2.dp, end = 2.dp, bottom = 4.dp, top = 44.dp),
                    verticalArrangement = Arrangement.SpaceBetween, horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CornerPlaque(corners.getOrNull(0), alignEnd = false, onTop = true, pulse = pulse, modifier = Modifier.fillMaxWidth(), compact = true)
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) { extras() }
                    CornerPlaque(corners.getOrNull(3), alignEnd = false, onTop = false, pulse = pulse, modifier = Modifier.fillMaxWidth(), compact = true)
                }
                board(Modifier.width(boardW).fillMaxHeight())
                Column(
                    modifier = Modifier.width(side).fillMaxHeight().padding(horizontal = 2.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.SpaceBetween, horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CornerPlaque(corners.getOrNull(1), alignEnd = true, onTop = true, pulse = pulse, modifier = Modifier.fillMaxWidth(), compact = true)
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        controls(minOf(side - 10.dp, availH * 0.18f).coerceIn(48.dp, 80.dp)); below()
                    }
                    CornerPlaque(corners.getOrNull(2), alignEnd = true, onTop = false, pulse = pulse, modifier = Modifier.fillMaxWidth(), compact = true)
                }
            }
        } else {
            // What the board leaves: a plaque row above (about 60 dp) and the bottom row with the die and Roll (about 100 dp).
            val reserve = 160.dp
            val boardH = minOf(screen.height * PORTRAIT_SHARE, availH - reserve).coerceAtLeast(availW * 0.8f)
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceEvenly) {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.Bottom) {
                    CornerPlaque(corners.getOrNull(0), alignEnd = false, onTop = true, pulse = pulse, modifier = Modifier.weight(1f))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(horizontal = 4.dp)) { extras() }
                    CornerPlaque(corners.getOrNull(1), alignEnd = true, onTop = true, pulse = pulse, modifier = Modifier.weight(1f))
                }
                board(Modifier.fillMaxWidth().height(boardH))
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    CornerPlaque(corners.getOrNull(3), alignEnd = false, onTop = false, pulse = pulse, modifier = Modifier.weight(1f))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) { controls(56.dp) }
                    CornerPlaque(corners.getOrNull(2), alignEnd = true, onTop = false, pulse = pulse, modifier = Modifier.weight(1f))
                }
                below()
            }
        }
    }
}

/** The board's share of the screen: of its height in portrait, of its width in landscape. */
const val PORTRAIT_SHARE = 0.70f
const val LANDSCAPE_SHARE = 0.80f
