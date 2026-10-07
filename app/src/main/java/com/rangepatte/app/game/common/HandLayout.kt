package com.rangepatte.app.game.common

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.thumbnails.CARD_ASPECT
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

/** The room a game has to play in: the inside of the table, below the header. Provided by [GameFrame]. */
data class TableArea(val width: Dp, val height: Dp)

val LocalTableArea = compositionLocalOf { TableArea(360.dp, 600.dp) }

/** Share of the table's height a player's hand may take. Larger than before: cards are the stars. */
const val HAND_HEIGHT_SHARE = 0.33f

/** Where a hand's cards go: how many rows, how wide each card is, and how far apart they sit. */
data class FanLayout(
    val rows: Int,
    val perRow: Int,
    val cardWidth: Dp,
    /** Horizontal distance from one card's left edge to the next in a row. */
    val step: Dp,
    /** How far each further row sits below the one before it. */
    val rowShift: Dp,
    val height: Dp
)

private const val ROW_OVERLAP = 0.56f   // the next row starts this far down the card above it

/**
 * Chooses the largest cards that let [count] cards fit in [availableWidth] × [availableHeight]:
 * one fanned row if the cards can stay at least [minStrip] of a card wide each (enough to read their
 * rank and suit), otherwise two overlapping rows. Cards never exceed [maxCardWidth], and keep their
 * true proportions.
 */
fun fanLayout(
    count: Int,
    availableWidth: Dp,
    availableHeight: Dp,
    maxCardWidth: Dp,
    minStrip: Float = 0.4f,
    preferredStrip: Float = 0.62f
): FanLayout {
    if (count <= 0) return FanLayout(1, 0, maxCardWidth, 0.dp, 0.dp, 0.dp)
    fun layoutFor(rows: Int): FanLayout {
        val perRow = ceil(count / rows.toFloat()).toInt()
        val byWidth = availableWidth / (1f + (perRow - 1) * minStrip)
        val rowsHeightFactor = CARD_ASPECT * (1f + (rows - 1) * ROW_OVERLAP)
        val byHeight = availableHeight / rowsHeightFactor
        val cw = min(min(maxCardWidth.value, byWidth.value), byHeight.value).dp
        val step = if (perRow > 1) min(cw.value * preferredStrip, ((availableWidth - cw) / (perRow - 1)).value).dp else 0.dp
        val shift = cw * CARD_ASPECT * ROW_OVERLAP
        return FanLayout(rows, perRow, cw, step, shift, cw * CARD_ASPECT + shift * (rows - 1))
    }
    val one = layoutFor(1)
    if (count <= 6) return one
    val two = layoutFor(2)
    // Two rows only when they make the cards clearly bigger.
    return if (two.cardWidth > one.cardWidth * 1.12f) two else one
}

/**
 * A player's hand laid out by [fanLayout] in the room the table gives it ([LocalTableArea]). Each card
 * is placed with its own [Modifier] (width and position) passed to [itemContent]; the caller adds any
 * extra offset, e.g. to stand playable cards up. [headroom] is reserved above the cards for lifting.
 */
@Composable
fun <T> FannedHand(
    items: List<T>,
    modifier: Modifier = Modifier,
    maxCardWidth: Dp = 96.dp,
    headroom: Dp = 12.dp,
    itemContent: @Composable (item: T, cardWidth: Dp, positioned: Modifier) -> Unit
) {
    val area = LocalTableArea.current
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val layout = fanLayout(
            count = items.size,
            availableWidth = maxWidth - 8.dp,
            availableHeight = area.height * HAND_HEIGHT_SHARE - headroom,
            maxCardWidth = maxCardWidth
        )
        val perRow = max(layout.perRow, 1)
        val rowWidth = if (items.isEmpty()) 0.dp else layout.cardWidth + layout.step * (perRow - 1)
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .width(rowWidth)
                .height(layout.height + headroom)
        ) {
            items.forEachIndexed { index, item ->
                val row = index / perRow
                val column = index % perRow
                // Cards in the second row start centred under the first when the rows are uneven.
                val inRow = if (row == layout.rows - 1) items.size - row * perRow else perRow
                val indent = layout.step * ((perRow - inRow) / 2f)
                itemContent(
                    item,
                    layout.cardWidth,
                    Modifier
                        .width(layout.cardWidth)
                        .offset(x = layout.step * column + indent, y = headroom + layout.rowShift * row)
                )
            }
        }
    }
}

/**
 * Cards in meld groups (Rummy): each group is a short overlapped run, groups wrap onto a second row
 * when they cannot all share one, and the cards are as large as the table allows. A group marked in
 * [tight] continues the run before it with no gap (used for loose cards, which are not a meld).
 */
@Composable
fun <T> GroupedHand(
    groups: List<List<T>>,
    modifier: Modifier = Modifier,
    tight: List<Boolean> = emptyList(),
    maxCardWidth: Dp = 84.dp,
    minCardWidth: Dp = 38.dp,
    headroom: Dp = 12.dp,
    itemContent: @Composable (item: T, cardWidth: Dp, positioned: Modifier) -> Unit
) {
    val area = LocalTableArea.current
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val plan = groupPlan(
            lengths = groups.map { it.size },
            tight = tight,
            availableWidth = maxWidth - 8.dp,
            availableHeight = area.height * HAND_HEIGHT_SHARE - headroom,
            maxCardWidth = maxCardWidth,
            minCardWidth = minCardWidth
        )
        Column(modifier = Modifier.align(Alignment.Center)) {
            Box(modifier = Modifier.width(plan.width).height(plan.height + headroom)) {
                plan.placements.forEach { place ->
                    groups[place.group].forEachIndexed { i, item ->
                        itemContent(
                            item,
                            plan.cardWidth,
                            Modifier
                                .width(plan.cardWidth)
                                .offset(x = place.x + plan.step * i, y = headroom + plan.rowShift * place.row)
                        )
                    }
                }
            }
        }
    }
}

/** Where one group starts: its [row] and the [x] of its first card. */
data class GroupPlace(val group: Int, val row: Int, val x: Dp)

data class GroupPlan(
    val cardWidth: Dp,
    val step: Dp,
    val rowShift: Dp,
    val rows: Int,
    val width: Dp,
    val height: Dp,
    val placements: List<GroupPlace>
)

private val GROUP_GAP = 12.dp
private const val GROUP_STEP = 0.46f

/**
 * Packs groups of the given [lengths] into rows (greedily, in order) and returns the largest card
 * width, between [minCardWidth] and [maxCardWidth], for which they fit in [availableWidth] ×
 * [availableHeight]. If even the smallest width does not fit, it is used anyway.
 */
fun groupPlan(
    lengths: List<Int>,
    tight: List<Boolean> = emptyList(),
    availableWidth: Dp,
    availableHeight: Dp,
    maxCardWidth: Dp,
    minCardWidth: Dp
): GroupPlan {
    fun planFor(cw: Dp): GroupPlan? {
        val step = cw * GROUP_STEP
        val rowShift = cw * CARD_ASPECT * ROW_OVERLAP
        val placements = ArrayList<GroupPlace>()
        var row = 0
        var x = 0.dp
        var widest = 0.dp
        lengths.forEachIndexed { index, length ->
            val groupWidth = cw + step * (max(length, 1) - 1)
            if (groupWidth > availableWidth) return null
            // A tight group overlaps the card before it exactly as the cards of one run overlap each other.
            if (tight.getOrElse(index) { false } && x > 0.dp) x -= (cw - step) + GROUP_GAP
            if (x > 0.dp && x + groupWidth > availableWidth) {
                row++
                x = 0.dp
            }
            placements += GroupPlace(index, row, x)
            widest = maxOf(widest, x + groupWidth)
            x += groupWidth + GROUP_GAP
        }
        val rows = row + 1
        return GroupPlan(cw, step, rowShift, rows, widest, cw * CARD_ASPECT + rowShift * (rows - 1), placements)
    }
    var cw = maxCardWidth
    while (cw >= minCardWidth) {
        val plan = planFor(cw)
        if (plan != null && plan.height <= availableHeight) return plan
        cw -= 2.dp
    }
    return planFor(minCardWidth) ?: planFor(availableWidth / 2) ?: GroupPlan(minCardWidth, 0.dp, 0.dp, 1, 0.dp, 0.dp, emptyList())
}
