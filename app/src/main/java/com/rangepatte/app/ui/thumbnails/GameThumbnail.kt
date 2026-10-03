package com.rangepatte.app.ui.thumbnails

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.rememberTextMeasurer
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.ui.cards.CardPalette
import com.rangepatte.app.ui.cards.CardStyle
import com.rangepatte.app.ui.cards.palette
import com.rangepatte.app.ui.theme.GoldenGlow
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * The picture on each game's tile — real cards arranged the way that game is known for:
 *
 * - Teen Patti / Flush: a trail of aces (♥ ♣ ♦)
 * - Rummy: K Q J of hearts laid as a sequence
 * - Twenty Nine: J 9 A 10 of diamonds (the four scoring ranks)
 * - Solitaire: the four aces raised on full foundation piles, a victory spread
 * - Coat Piece: A down to 2 of clubs swirled open like a hand of 13
 * - Dehla Pakad: the four tens swirled open
 * - Lakadi: a hand-written score sheet for four players over four games
 * - Spider Solitaire: one full suit of spades, K → A, cascading down two tableau columns
 */
@Composable
fun GameThumbnail(gameId: GameId, modifier: Modifier = Modifier) {
    val textMeasurer = rememberTextMeasurer()
    val palette = remember { CardStyle.CLASSICAL_IVORY.palette() }
    Canvas(modifier = modifier.fillMaxSize()) {
        when (gameId) {
            GameId.TEEN_PATTI -> drawPlacements(
                fan(listOf(Rank.ACE of Suit.HEARTS, Rank.ACE of Suit.CLUBS, Rank.ACE of Suit.DIAMONDS), spread = 40f, pivotDrop = 0.25f),
                textMeasurer, palette
            )
            GameId.RUMMY -> drawPlacements(
                fan(listOf(Rank.KING of Suit.HEARTS, Rank.QUEEN of Suit.HEARTS, Rank.JACK of Suit.HEARTS), spread = 18f, pivotDrop = 2.2f),
                textMeasurer, palette
            )
            GameId.TWENTY_NINE -> drawPlacements(
                fan(
                    listOf(Rank.JACK of Suit.DIAMONDS, Rank.NINE of Suit.DIAMONDS, Rank.ACE of Suit.DIAMONDS, Rank.TEN of Suit.DIAMONDS),
                    spread = 51f,
                    pivotDrop = 0.4f
                ),
                textMeasurer, palette
            )
            GameId.SOLITAIRE -> drawSolitaireVictory(textMeasurer, palette)
            GameId.COAT_PIECE -> drawPlacements(fan(clubsAceToTwo, spread = 150f, pivotDrop = 0.25f), textMeasurer, palette)
            GameId.DEHLA_PAKAD -> drawPlacements(fan(Suit.entries.map { Rank.TEN of it }, spread = 100f, pivotDrop = 0f), textMeasurer, palette)
            GameId.LAKADI -> drawLakadiScoreSheet(textMeasurer)
            GameId.SPIDER_SOLITAIRE -> drawSpiderCascade(textMeasurer, palette)
        }
    }
}

private infix fun Rank.of(suit: Suit) = PlayingCard(suit = suit, rank = this)

/** A, K, Q, J, 10 … 2 of clubs — the order a player sorts a full hand in. */
private val clubsAceToTwo: List<PlayingCard> =
    (listOf(Rank.ACE) + Rank.entries.drop(1).reversed()).map { it of Suit.CLUBS }

/**
 * One card in a layout, in "card units": a card is 1 wide and [CARD_ASPECT] tall. It sits with
 * its top-left at [topLeft], then is turned [angle] degrees clockwise about [pivot].
 */
private class Placement(
    val card: PlayingCard?,
    val topLeft: Offset,
    val angle: Float = 0f,
    val pivot: Offset = Offset.Zero,
    val inlineIndex: Boolean = false
)

/** Cards fanned in the hand: all share a pivot [pivotDrop] card-widths below their bottom edge. */
private fun fan(cards: List<PlayingCard>, spread: Float, pivotDrop: Float): List<Placement> {
    val last = (cards.size - 1).coerceAtLeast(1)
    return cards.mapIndexed { i, card ->
        val angle = if (cards.size == 1) 0f else -spread / 2f + spread * i / last
        Placement(card, topLeft = Offset(-0.5f, -(CARD_ASPECT + pivotDrop)), angle = angle)
    }
}

private fun Placement.corners(): List<Offset> {
    val radians = Math.toRadians(angle.toDouble())
    val c = cos(radians).toFloat()
    val s = sin(radians).toFloat()
    return listOf(
        topLeft,
        topLeft + Offset(1f, 0f),
        topLeft + Offset(0f, CARD_ASPECT),
        topLeft + Offset(1f, CARD_ASPECT)
    ).map { p ->
        val d = p - pivot
        pivot + Offset(d.x * c - d.y * s, d.x * s + d.y * c)
    }
}

/**
 * Scales [placements] (in card units) to fill the canvas, centred with a small margin, and draws
 * them in order (later cards on top). Returns the units→pixels mapping and the card width in
 * pixels, so a caller can add decorations in the same coordinate space.
 */
private fun DrawScope.drawPlacements(
    placements: List<Placement>,
    textMeasurer: TextMeasurer,
    palette: CardPalette,
    margin: Float = 0.07f
): Pair<(Offset) -> Offset, Float> {
    val all = placements.flatMap { it.corners() }
    val minX = all.minOf { it.x }
    val maxX = all.maxOf { it.x }
    val minY = all.minOf { it.y }
    val maxY = all.maxOf { it.y }
    val availableW = size.width * (1f - margin * 2)
    val availableH = size.height * (1f - margin * 2)
    val scale = min(availableW / max(maxX - minX, 0.01f), availableH / max(maxY - minY, 0.01f))
    val origin = Offset(
        (size.width - (maxX - minX) * scale) / 2f - minX * scale,
        (size.height - (maxY - minY) * scale) / 2f - minY * scale
    )
    val toPx: (Offset) -> Offset = { origin + it * scale }
    val cardSize = Size(scale, scale * CARD_ASPECT)
    placements.forEach { p ->
        rotate(degrees = p.angle, pivot = toPx(p.pivot)) {
            drawMiniCard(p.card, toPx(p.topLeft), cardSize, textMeasurer, palette, p.inlineIndex)
        }
    }
    return toPx to scale
}

/** Four aces on full foundation piles, raised like a crown, with a few victory sparkles. */
private fun DrawScope.drawSolitaireVictory(textMeasurer: TextMeasurer, palette: CardPalette) {
    val aces = listOf(Suit.HEARTS, Suit.SPADES, Suit.DIAMONDS, Suit.CLUBS)
    val lift = listOf(0.3f, 0f, 0f, 0.3f)
    val tilt = listOf(-10f, -3f, 3f, 10f)
    val placements = aces.flatMapIndexed { i, suit ->
        val topLeft = Offset(i * 0.92f, lift[i])
        val pivot = topLeft + Offset(0.5f, CARD_ASPECT / 2f)
        listOf(
            Placement(null, topLeft + Offset(0f, 0.16f), tilt[i], pivot),
            Placement(null, topLeft + Offset(0f, 0.08f), tilt[i], pivot),
            Placement(Rank.ACE of suit, topLeft, tilt[i], pivot)
        )
    }
    val (toPx, cardWidth) = drawPlacements(placements, textMeasurer, palette, margin = 0.1f)
    listOf(Offset(0.1f, -0.12f), Offset(1.4f, -0.3f), Offset(2.75f, -0.08f), Offset(2.05f, -0.42f)).forEachIndexed { i, spot ->
        drawSparkle(toPx(spot), cardWidth * if (i % 2 == 0) 0.2f else 0.14f)
    }
}

private fun DrawScope.drawSparkle(center: Offset, radius: Float) {
    val waist = radius * 0.22f
    val star = Path().apply {
        moveTo(center.x, center.y - radius)
        lineTo(center.x + waist, center.y - waist)
        lineTo(center.x + radius, center.y)
        lineTo(center.x + waist, center.y + waist)
        lineTo(center.x, center.y + radius)
        lineTo(center.x - waist, center.y + waist)
        lineTo(center.x - radius, center.y)
        lineTo(center.x - waist, center.y - waist)
        close()
    }
    drawPath(star, color = GoldenGlow)
}

/** K♠ … 7♠ in one tableau column and 6♠ … A♠ in the next, overlapping as they lie mid-game. */
private fun DrawScope.drawSpiderCascade(textMeasurer: TextMeasurer, palette: CardPalette) {
    val step = 0.36f
    val kingToSeven = listOf(Rank.KING, Rank.QUEEN, Rank.JACK, Rank.TEN, Rank.NINE, Rank.EIGHT, Rank.SEVEN)
    val sixToAce = listOf(Rank.SIX, Rank.FIVE, Rank.FOUR, Rank.THREE, Rank.TWO, Rank.ACE)
    val placements = kingToSeven.mapIndexed { i, rank ->
        Placement(rank of Suit.SPADES, Offset(0f, i * step), inlineIndex = true)
    } + sixToAce.mapIndexed { i, rank ->
        Placement(rank of Suit.SPADES, Offset(1.15f, step * 0.5f + i * step), inlineIndex = true)
    }
    drawPlacements(placements, textMeasurer, palette, margin = 0.06f)
}
