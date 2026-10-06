package com.rangepatte.app.game.spider

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.TableauCard
import kotlin.random.Random

/**
 * A Spider solitaire position: ten columns (last element = top card), a stock of 50 cards dealt ten
 * at a time, and how many full King→Ace runs have been cleared (eight wins).
 */
data class SpiderState(
    val tableau: List<List<TableauCard>>,
    val stock: List<PlayingCard>,
    val completed: Int,
    val suitCount: Int,
    val moves: Int = 0
) {
    val isWon: Boolean get() = completed == SpiderEngine.RUNS_TO_WIN
    val dealsLeft: Int get() = stock.size / SpiderEngine.COLUMNS
}

sealed interface SpiderMove {
    /** Move the run from [index] to the end of column [from] onto column [to]. */
    data class MoveRun(val from: Int, val index: Int, val to: Int) : SpiderMove
    /** Deal one card face-up onto every column from the stock. */
    data object Deal : SpiderMove
}

object SpiderEngine {
    const val COLUMNS = 10
    const val RUNS_TO_WIN = 8

    /** [suitCount] of 1, 2 or 4 suits makes the game easy, medium or hard. */
    fun newGame(suitCount: Int, random: Random = Random.Default): SpiderState {
        require(suitCount in listOf(1, 2, 4)) { "suitCount must be 1, 2 or 4" }
        val suits = Suit.entries.take(suitCount)
        val copiesPerSuit = RUNS_TO_WIN / suitCount
        val cards = suits.flatMap { suit ->
            (0 until copiesPerSuit).flatMap { copy ->
                Rank.entries.map { rank -> PlayingCard(suit, rank, id = "${suit.name}-${rank.name}-$copy") }
            }
        }.shuffled(random)

        var next = 0
        val tableau = List(COLUMNS) { column ->
            val size = if (column < 4) 6 else 5
            List(size) { row -> TableauCard(cards[next++], faceUp = row == size - 1) }
        }
        return SpiderState(tableau = tableau, stock = cards.drop(next), completed = 0, suitCount = suitCount)
    }

    /** True when the cards from [index] to the end of [column] form a face-up, same-suit, descending run. */
    fun isMovableRun(column: List<TableauCard>, index: Int): Boolean {
        if (index !in column.indices) return false
        val run = column.drop(index)
        if (run.any { !it.faceUp }) return false
        return run.zipWithNext().all { (upper, lower) ->
            upper.card.suit == lower.card.suit && upper.card.rank.value == lower.card.rank.value + 1
        }
    }

    fun apply(state: SpiderState, move: SpiderMove): SpiderState? {
        val result = when (move) {
            is SpiderMove.MoveRun -> {
                val from = state.tableau.getOrNull(move.from) ?: return null
                val to = state.tableau.getOrNull(move.to) ?: return null
                if (move.from == move.to || !isMovableRun(from, move.index)) return null
                val lead = from[move.index].card
                val top = to.lastOrNull()
                if (top != null && (!top.faceUp || top.card.rank.value != lead.rank.value + 1)) return null
                val run = from.drop(move.index)
                state.copy(
                    tableau = state.tableau.mapIndexed { i, column ->
                        when (i) {
                            move.from -> flipTop(column.take(move.index))
                            move.to -> column + run
                            else -> column
                        }
                    }
                )
            }
            SpiderMove.Deal -> {
                if (state.stock.size < COLUMNS || state.tableau.any { it.isEmpty() }) return null
                val dealt = state.stock.takeLast(COLUMNS)
                state.copy(
                    stock = state.stock.dropLast(COLUMNS),
                    tableau = state.tableau.mapIndexed { i, column -> column + TableauCard(dealt[i], faceUp = true) }
                )
            }
        }
        return removeCompletedRuns(result).let { it.copy(moves = state.moves + 1) }
    }

    /** Why a Deal is refused, for a helpful message: an empty column is in the way. */
    fun dealBlockedByEmptyColumn(state: SpiderState): Boolean =
        state.stock.size >= COLUMNS && state.tableau.any { it.isEmpty() }

    private fun removeCompletedRuns(state: SpiderState): SpiderState {
        var completed = state.completed
        val tableau = state.tableau.map { column ->
            if (column.size >= 13 && isMovableRun(column, column.size - 13) && column[column.size - 13].card.rank == Rank.KING) {
                completed++
                flipTop(column.dropLast(13))
            } else {
                column
            }
        }
        return state.copy(tableau = tableau, completed = completed)
    }

    private fun flipTop(column: List<TableauCard>): List<TableauCard> {
        val top = column.lastOrNull() ?: return column
        return if (top.faceUp) column else column.dropLast(1) + top.copy(faceUp = true)
    }
}
