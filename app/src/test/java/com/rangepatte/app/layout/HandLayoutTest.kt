package com.rangepatte.app.layout

import androidx.compose.ui.unit.dp
import com.rangepatte.app.game.common.fanLayout
import com.rangepatte.app.game.common.groupPlan
import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** The hand layouts must never overflow, whatever the screen and however many cards. */
class HandLayoutTest {
    @Test
    fun fannedHandAlwaysFitsItsRoom() {
        for (width in listOf(300, 320, 360, 392, 412, 480, 600)) for (height in listOf(140, 180, 220, 260, 300, 400)) for (count in 1..13) {
            val layout = fanLayout(count, width.dp, height.dp, 92.dp)
            val rowWidth = layout.cardWidth + layout.step * (layout.perRow - 1)
            assertTrue("width: $count cards in ${width}x$height -> $layout", rowWidth.value <= width + 0.01f)
            // Cards only get smaller than 20dp when the room itself is tiny; otherwise the height must fit too.
            if (layout.cardWidth.value > 20f) assertTrue("height: $count cards in ${width}x$height -> $layout", layout.height.value <= height + 0.5f)
            assertTrue(layout.cardWidth <= 92.dp)
        }
    }

    @Test
    fun thirteenCardsUseTwoRowsWhenThereIsRoomAndOneWhenThereIsNot() {
        val roomy = fanLayout(13, 350.dp, 220.dp, 92.dp)
        assertEquals(2, roomy.rows)
        assertEquals(92f, roomy.cardWidth.value, 0.01f)
        val short = fanLayout(13, 350.dp, 140.dp, 92.dp)
        assertEquals(1, short.rows)
    }

    @Test
    fun looseCardsContinueTheirRunAndWrapOnlyWhenTheRowIsFull() {
        // Three melds then ten loose single cards, on a 350dp-wide, 230dp-tall table.
        val lengths = listOf(3, 3, 3) + List(10) { 1 }
        val tight = lengths.indices.map { it > 3 }
        val plan = groupPlan(lengths, tight, 350.dp, 230.dp, 84.dp, 38.dp)
        assertTrue("needs more than one row: $plan", plan.rows >= 2)
        assertTrue("fits the height: $plan", plan.height.value <= 230.5f)
        plan.placements.forEach { place ->
            val groupWidth = plan.cardWidth + plan.step * (lengths[place.group] - 1)
            assertTrue((place.x + groupWidth).value <= 350.5f)
        }
        // Consecutive loose cards in a row sit one step apart, like the cards of a single run.
        val loose = plan.placements.filter { it.group > 3 && it.row == plan.placements.last().row }
        loose.zipWithNext().forEach { (a, b) -> assertEquals(plan.step.value, (b.x - a.x).value, 0.01f) }
    }

    @Test
    fun meldGroupsWrapButNeverRunOffTheRight() {
        val random = Random(3)
        repeat(1000) {
            val width = listOf(300, 320, 360, 412, 500).random(random)
            val height = listOf(160, 220, 300).random(random)
            val lengths = ArrayList<Int>()
            var left = 13
            while (left > 0) {
                val group = minOf(left, random.nextInt(1, 6))
                lengths += group
                left -= group
            }
            val tight = lengths.indices.map { random.nextBoolean() }
            val plan = groupPlan(lengths, tight, width.dp, height.dp, 84.dp, 38.dp)
            plan.placements.forEach { place ->
                val groupWidth = plan.cardWidth + plan.step * (lengths[place.group] - 1)
                assertTrue("$lengths in ${width}x$height -> $plan", (place.x + groupWidth).value <= width + 0.5f)
            }
            if (plan.cardWidth.value > 38.5f) assertTrue("$lengths in ${width}x$height -> $plan", plan.height.value <= height + 0.5f)
        }
    }
}
