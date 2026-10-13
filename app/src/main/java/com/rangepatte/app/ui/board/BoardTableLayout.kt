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
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    controls: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    below: @Composable () -> Unit = {}
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val landscape = maxWidth > maxHeight * 1.15f
        if (landscape) {
            Row(modifier = Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(6.dp), verticalArrangement = Arrangement.SpaceBetween) {
                    CornerPlaque(corners.getOrNull(0), alignEnd = false, onTop = true, pulse = pulse, modifier = Modifier.fillMaxWidth())
                    CornerPlaque(corners.getOrNull(3), alignEnd = false, onTop = false, pulse = pulse, modifier = Modifier.fillMaxWidth())
                }
                board(Modifier.fillMaxHeight().aspectRatio(1f, matchHeightConstraintsFirst = true))
                Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(6.dp), verticalArrangement = Arrangement.SpaceBetween, horizontalAlignment = Alignment.End) {
                    CornerPlaque(corners.getOrNull(1), alignEnd = true, onTop = true, pulse = pulse, modifier = Modifier.fillMaxWidth())
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) { controls(); below() }
                    CornerPlaque(corners.getOrNull(2), alignEnd = true, onTop = false, pulse = pulse, modifier = Modifier.fillMaxWidth())
                }
            }
        } else {
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceEvenly) {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.Bottom) {
                    CornerPlaque(corners.getOrNull(0), alignEnd = false, onTop = true, pulse = pulse, modifier = Modifier.weight(1f))
                    Spacer(Modifier.width(8.dp))
                    CornerPlaque(corners.getOrNull(1), alignEnd = true, onTop = true, pulse = pulse, modifier = Modifier.weight(1f))
                }
                board(Modifier.fillMaxWidth().aspectRatio(1f))
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    CornerPlaque(corners.getOrNull(3), alignEnd = false, onTop = false, pulse = pulse, modifier = Modifier.weight(1f))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) { controls() }
                    CornerPlaque(corners.getOrNull(2), alignEnd = true, onTop = false, pulse = pulse, modifier = Modifier.weight(1f))
                }
                below()
            }
        }
    }
}
