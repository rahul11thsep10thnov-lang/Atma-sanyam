package com.rangepatte.app.game.solitaire

import com.rangepatte.app.domain.game.Deck
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.TableauCard
import kotlin.random.Random

/**
 * A Klondike solitaire position. Piles are plain lists whose *last* element is the top card.
 *
 * - [stock]: face-down draw pile; [waste]: face-up cards turned from it.
 * - [foundations]: four piles indexed by [Suit.entries] order, each built Ace → King in one suit.
 * - [tableau]: seven columns, bottom → top; only the face-up cards are playable.
 * - [drawCount]: 1 or 3 cards turned from the stock at a time.
 */
data class SolitaireState(
    val stock: List<PlayingCard>,
    val waste: List<PlayingCard>,
    val foundations: List<List<PlayingCard>>,
    val tableau: List<List<TableauCard>>,
    val drawCount: Int,
    val moves: Int = 0
) {
    val isWon: Boolean get() = foundations.all { it.size == 13 }
}

sealed interface SolitaireMove {
    /** Turn cards from the stock onto the waste — or, with an empty stock, flip the waste back over. */
    data object Draw : SolitaireMove
    data class WasteToTableau(val to: Int) : SolitaireMove
    data object WasteToFoundation : SolitaireMove
    /** Move the run starting at [index] of column [from] (to the end of that column) onto column [to]. */
    data class TableauToTableau(val from: Int, val index: Int, val to: Int) : SolitaireMove
    data class TableauToFoundation(val from: Int) : SolitaireMove
    data class FoundationToTableau(val suit: Suit, val to: Int) : SolitaireMove
}

object SolitaireEngine {
    const val COLUMNS = 7

    fun newGame(drawCount: Int, random: Random = Random.Default): SolitaireState {
        val cards = Deck.standard().shuffled(random).cards
        var next = 0
        val tableau = List(COLUMNS) { column ->
            List(column + 1) { row ->
                TableauCard(cards[next++], faceUp = row == column)
            }
        }
        return SolitaireState(
            stock = cards.drop(next),
            waste = emptyList(),
            foundations = List(4) { emptyList() },
            tableau = tableau,
            drawCount = drawCount
        )
    }

    /** Applies [move] and returns the new position, or null if the move is not allowed. */
    fun apply(state: SolitaireState, move: SolitaireMove): SolitaireState? {
        val result = when (move) {
            SolitaireMove.Draw -> draw(state)
            is SolitaireMove.WasteToTableau -> {
                val card = state.waste.lastOrNull() ?: return null
                if (!canPlaceOnTableau(card, state.tableau.getOrNull(move.to))) return null
                state.copy(
                    waste = state.waste.dropLast(1),
                    tableau = state.tableau.replace(move.to) { it + TableauCard(card, true) }
                )
            }
            SolitaireMove.WasteToFoundation -> {
                val card = state.waste.lastOrNull() ?: return null
                if (!canPlaceOnFoundation(card, state.foundations)) return null
                state.copy(waste = state.waste.dropLast(1), foundations = state.foundations.withCard(card))
            }
            is SolitaireMove.TableauToTableau -> {
                val column = state.tableau.getOrNull(move.from) ?: return null
                if (move.from == move.to || move.index !in column.indices) return null
                val run = column.drop(move.index)
                if (run.any { !it.faceUp }) return null
                if (!canPlaceOnTableau(run.first().card, state.tableau.getOrNull(move.to))) return null
                state.copy(
                    tableau = state.tableau
                        .replace(move.from) { flipTop(it.take(move.index)) }
                        .replace(move.to) { it + run }
                )
            }
            is SolitaireMove.TableauToFoundation -> {
                val column = state.tableau.getOrNull(move.from) ?: return null
                val top = column.lastOrNull()?.takeIf { it.faceUp } ?: return null
                if (!canPlaceOnFoundation(top.card, state.foundations)) return null
                state.copy(
                    tableau = state.tableau.replace(move.from) { flipTop(it.dropLast(1)) },
                    foundations = state.foundations.withCard(top.card)
                )
            }
            is SolitaireMove.FoundationToTableau -> {
                val pile = state.foundations[move.suit.ordinal]
                val card = pile.lastOrNull() ?: return null
                if (!canPlaceOnTableau(card, state.tableau.getOrNull(move.to))) return null
                state.copy(
                    foundations = state.foundations.replace(move.suit.ordinal) { it.dropLast(1) },
                    tableau = state.tableau.replace(move.to) { it + TableauCard(card, true) }
                )
            }
        } ?: return null
        return result.copy(moves = state.moves + 1)
    }

    private fun draw(state: SolitaireState): SolitaireState? = when {
        state.stock.isNotEmpty() -> {
            val count = minOf(state.drawCount, state.stock.size)
            val drawn = state.stock.takeLast(count).reversed()
            state.copy(stock = state.stock.dropLast(count), waste = state.waste + drawn)
        }
        state.waste.isNotEmpty() -> state.copy(stock = state.waste.reversed(), waste = emptyList())
        else -> null
    }

    /** A card goes on a column if it is empty and the card is a King, or it is one lower and of the other colour. */
    fun canPlaceOnTableau(card: PlayingCard, column: List<TableauCard>?): Boolean {
        column ?: return false
        val top = column.lastOrNull() ?: return card.rank == Rank.KING
        return top.faceUp && top.card.isRed != card.isRed && top.card.rank.value == card.rank.value + 1
    }

    fun canPlaceOnFoundation(card: PlayingCard, foundations: List<List<PlayingCard>>): Boolean =
        foundations[card.suit.ordinal].size + 1 == card.rank.value

    /** True when nothing is hidden any more — the rest of the game is just moving cards up. */
    fun canAutoFinish(state: SolitaireState): Boolean =
        !state.isWon && state.stock.isEmpty() && state.waste.isEmpty() && state.tableau.all { column -> column.all { it.faceUp } }

    /** Repeatedly plays every card that can go to a foundation. Returns the final position. */
    fun autoFinish(state: SolitaireState): SolitaireState {
        var current = state
        while (!current.isWon) {
            val next = (0 until COLUMNS).firstNotNullOfOrNull { column ->
                apply(current, SolitaireMove.TableauToFoundation(column))
            } ?: apply(current, SolitaireMove.WasteToFoundation) ?: break
            current = next
        }
        return current
    }

    private fun flipTop(column: List<TableauCard>): List<TableauCard> {
        val top = column.lastOrNull() ?: return column
        return if (top.faceUp) column else column.dropLast(1) + top.copy(faceUp = true)
    }

    private fun <T> List<T>.replace(index: Int, transform: (T) -> T): List<T> =
        mapIndexed { i, item -> if (i == index) transform(item) else item }

    private fun List<List<PlayingCard>>.withCard(card: PlayingCard): List<List<PlayingCard>> =
        replace(card.suit.ordinal) { it + card }
}
