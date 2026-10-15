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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The board games' table, laid out like the classic Ludo screen: a plaque at each corner of the board
 * (index 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left — where each player's yard is on
 * screen) and the die between the two bottom plaques. The board takes the full width in portrait, so
 * the board and its plaques fill about three quarters of the screen. In landscape the board takes the
 * full height, with the plaques and the die in columns on either side.
 */
@Composable
fun BoardTableLayout(
    corners: List<CornerPlayer?>,
    pulse: Float,
    board: @Composable (Modifier) -> Unit,
    controls: @Composable (dieSize: Dp) -> Unit,
    modifier: Modifier = Modifier,
    below: @Composable () -> Unit = {}
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val availW = maxWidth
        val availH = maxHeight
        val landscape = availW > availH * 1.15f
        // The board covers 7/13 of the table's area (as a square), never more than the room allows.
        val side = minOf(minOf(availW, availH), with(androidx.compose.ui.platform.LocalDensity.current) { kotlin.math.sqrt(7f / 13f * availW.toPx() * availH.toPx()).toDp() })
        if (landscape) {
            Row(modifier = Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(start = 6.dp, end = 6.dp, bottom = 6.dp, top = 40.dp), verticalArrangement = Arrangement.SpaceBetween) {
                    CornerPlaque(corners.getOrNull(0), alignEnd = false, onTop = true, pulse = pulse, modifier = Modifier.fillMaxWidth())
                    CornerPlaque(corners.getOrNull(3), alignEnd = false, onTop = false, pulse = pulse, modifier = Modifier.fillMaxWidth())
                }
                board(Modifier.size(side))
                Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(6.dp), verticalArrangement = Arrangement.SpaceBetween, horizontalAlignment = Alignment.End) {
                    CornerPlaque(corners.getOrNull(1), alignEnd = true, onTop = true, pulse = pulse, modifier = Modifier.fillMaxWidth())
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) { controls((availH * 0.26f).coerceIn(68.dp, 110.dp)); below() }
                    CornerPlaque(corners.getOrNull(2), alignEnd = true, onTop = false, pulse = pulse, modifier = Modifier.fillMaxWidth())
                }
            }
        } else {
            // Tall phones leave room below a square board: the die then gets a big row of its own, so the
            // table is filled from top to bottom instead of leaving gaps.
            val roomy = availH - side > 250.dp
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceEvenly) {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.Bottom) {
                    CornerPlaque(corners.getOrNull(0), alignEnd = false, onTop = true, pulse = pulse, modifier = Modifier.weight(1f))
                    Spacer(Modifier.width(8.dp))
                    CornerPlaque(corners.getOrNull(1), alignEnd = true, onTop = true, pulse = pulse, modifier = Modifier.weight(1f))
                }
                board(Modifier.size(side).align(Alignment.CenterHorizontally))
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    CornerPlaque(corners.getOrNull(3), alignEnd = false, onTop = false, pulse = pulse, modifier = Modifier.weight(1f))
                    if (roomy) Spacer(Modifier.width(8.dp)) else Column(horizontalAlignment = Alignment.CenterHorizontally) { controls(68.dp) }
                    CornerPlaque(corners.getOrNull(2), alignEnd = true, onTop = false, pulse = pulse, modifier = Modifier.weight(1f))
                }
                if (roomy) Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    controls(((availH - side - 150.dp)).coerceIn(90.dp, 150.dp))
                }
                below()
            }
        }
    }
}
