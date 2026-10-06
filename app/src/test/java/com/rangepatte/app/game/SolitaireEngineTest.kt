package com.rangepatte.app.game

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.TableauCard
import com.rangepatte.app.game.solitaire.SolitaireEngine
import com.rangepatte.app.game.solitaire.SolitaireMove
import com.rangepatte.app.game.solitaire.SolitaireState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class SolitaireEngineTest {
    private fun card(rank: Rank, suit: Suit) = PlayingCard(suit, rank)
    private fun total(state: SolitaireState) =
        state.stock.size + state.waste.size + state.foundations.sumOf { it.size } + state.tableau.sumOf { it.size }

    private fun emptyState(drawCount: Int = 1) = SolitaireState(
        stock = emptyList(), waste = emptyList(), foundations = List(4) { emptyList() },
        tableau = List(7) { emptyList() }, drawCount = drawCount
    )

    @Test fun newGameHasCorrectLayout() {
        val state = SolitaireEngine.newGame(1, Random(1))
        assertEquals(52, total(state))
        assertEquals(24, state.stock.size)
        state.tableau.forEachIndexed { i, column ->
            assertEquals(i + 1, column.size)
            assertTrue(column.last().faceUp)
            assertTrue(column.dropLast(1).none { it.faceUp })
        }
        assertEquals(52, (state.stock + state.tableau.flatten().map { it.card }).toSet().size)
    }

    @Test fun drawOneAndThreeAndRecycle() {
        val s1 = SolitaireEngine.newGame(1, Random(2))
        val d1 = SolitaireEngine.apply(s1, SolitaireMove.Draw)!!
        assertEquals(1, d1.waste.size)
        assertEquals(23, d1.stock.size)
        val s3 = SolitaireEngine.newGame(3, Random(2))
        val d3 = SolitaireEngine.apply(s3, SolitaireMove.Draw)!!
        assertEquals(3, d3.waste.size)
        // draw everything, then the next draw recycles the waste
        var s = s1
        repeat(24) { s = SolitaireEngine.apply(s, SolitaireMove.Draw)!! }
        assertTrue(s.stock.isEmpty())
        val recycled = SolitaireEngine.apply(s, SolitaireMove.Draw)!!
        assertEquals(24, recycled.stock.size)
        assertTrue(recycled.waste.isEmpty())
        // recycling restores the original draw order
        assertEquals(s1.stock, recycled.stock)
        assertNull(SolitaireEngine.apply(emptyState(), SolitaireMove.Draw))
    }

    @Test fun tableauRules() {
        val base = emptyState().copy(
            tableau = listOf(
                listOf(TableauCard(card(Rank.EIGHT, Suit.SPADES), true)),
                listOf(TableauCard(card(Rank.SEVEN, Suit.HEARTS), true)),
                listOf(TableauCard(card(Rank.SEVEN, Suit.CLUBS), true)),
                emptyList(), emptyList(), emptyList(), emptyList()
            )
        )
        // red 7 on black 8: allowed; black 7 on black 8: not
        assertNotNull(SolitaireEngine.apply(base, SolitaireMove.TableauToTableau(1, 0, 0)))
        assertNull(SolitaireEngine.apply(base, SolitaireMove.TableauToTableau(2, 0, 0)))
        // only a King may go to an empty column
        assertNull(SolitaireEngine.apply(base, SolitaireMove.TableauToTableau(0, 0, 3)))
        val withKing = base.copy(tableau = base.tableau.mapIndexed { i, c -> if (i == 0) listOf(TableauCard(card(Rank.KING, Suit.SPADES), true)) else c })
        assertNotNull(SolitaireEngine.apply(withKing, SolitaireMove.TableauToTableau(0, 0, 3)))
    }

    @Test fun runMovesAndFlipsUncoveredCard() {
        val state = emptyState().copy(
            tableau = listOf(
                listOf(TableauCard(card(Rank.TWO, Suit.CLUBS), false), TableauCard(card(Rank.FIVE, Suit.HEARTS), true), TableauCard(card(Rank.FOUR, Suit.SPADES), true)),
                listOf(TableauCard(card(Rank.SIX, Suit.CLUBS), true)),
                emptyList(), emptyList(), emptyList(), emptyList(), emptyList()
            )
        )
        val moved = SolitaireEngine.apply(state, SolitaireMove.TableauToTableau(0, 1, 1))!!
        assertEquals(3, moved.tableau[1].size)
        assertEquals(1, moved.tableau[0].size)
        assertTrue("uncovered card must flip", moved.tableau[0].last().faceUp)
        // a run containing a face-down card can't move
        assertNull(SolitaireEngine.apply(state, SolitaireMove.TableauToTableau(0, 0, 1)))
    }

    @Test fun foundationBuildsInOrderAndCanComeBack() {
        var state = emptyState().copy(
            waste = listOf(card(Rank.TWO, Suit.HEARTS), card(Rank.ACE, Suit.HEARTS)),
            tableau = emptyState().tableau.mapIndexed { i, c -> if (i == 0) listOf(TableauCard(card(Rank.SIX, Suit.CLUBS), true)) else c }
        )
        assertNull(SolitaireEngine.apply(state.copy(waste = listOf(card(Rank.TWO, Suit.HEARTS))), SolitaireMove.WasteToFoundation))
        state = SolitaireEngine.apply(state, SolitaireMove.WasteToFoundation)!!
        state = SolitaireEngine.apply(state, SolitaireMove.WasteToFoundation)!!
        assertEquals(2, state.foundations[Suit.HEARTS.ordinal].size)
        // 2♥ is red and 6♣ top needs a 5 — not placeable; but 5 on 6 works for a 5♥ if present
        assertNull(SolitaireEngine.apply(state, SolitaireMove.FoundationToTableau(Suit.HEARTS, 0)))
        assertEquals(2, state.moves)
    }

    @Test fun autoFinishWinsWhenEverythingIsFaceUp() {
        val tableau = Suit.entries.map { suit -> Rank.entries.reversed().map { TableauCard(card(it, suit), true) } } + List(3) { emptyList<TableauCard>() }
        val state = emptyState().copy(tableau = tableau)
        assertTrue(SolitaireEngine.canAutoFinish(state))
        val done = SolitaireEngine.autoFinish(state)
        assertTrue(done.isWon)
    }

    @Test fun randomPlayConservesCardsAndNeverCorrupts() {
        repeat(30) { seed ->
            val random = Random(seed)
            var state = SolitaireEngine.newGame(if (seed % 2 == 0) 1 else 3, random)
            repeat(400) {
                val candidates = buildList<SolitaireMove> {
                    add(SolitaireMove.Draw); add(SolitaireMove.WasteToFoundation)
                    for (to in 0 until 7) add(SolitaireMove.WasteToTableau(to))
                    for (from in 0 until 7) {
                        add(SolitaireMove.TableauToFoundation(from))
                        for (index in state.tableau[from].indices) for (to in 0 until 7) add(SolitaireMove.TableauToTableau(from, index, to))
                    }
                    for (suit in Suit.entries) for (to in 0 until 7) add(SolitaireMove.FoundationToTableau(suit, to))
                }
                val legal = candidates.mapNotNull { SolitaireEngine.apply(state, it) }
                if (legal.isNotEmpty()) state = legal.random(random)
                assertEquals(52, total(state))
                assertTrue(state.tableau.all { column -> column.isEmpty() || column.last().faceUp })
                state.foundations.forEachIndexed { i, pile ->
                    assertTrue(pile.indices.all { j -> pile[j].suit.ordinal == i && pile[j].rank.value == j + 1 })
                }
            }
        }
    }
}
