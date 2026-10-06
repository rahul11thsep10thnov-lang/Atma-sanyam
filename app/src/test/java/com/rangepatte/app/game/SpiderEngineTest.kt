package com.rangepatte.app.game

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.TableauCard
import com.rangepatte.app.game.spider.SpiderEngine
import com.rangepatte.app.game.spider.SpiderMove
import com.rangepatte.app.game.spider.SpiderState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class SpiderEngineTest {
    private fun up(rank: Rank, suit: Suit = Suit.SPADES, copy: Int = 0) = TableauCard(PlayingCard(suit, rank, "${suit.name}-${rank.name}-$copy"), true)
    private fun total(s: SpiderState) = s.stock.size + s.tableau.sumOf { it.size } + s.completed * 13
    private fun empty(stock: List<PlayingCard> = emptyList()) = SpiderState(List(10) { emptyList() }, stock, 0, 1)

    @Test fun newGameLayout() {
        for (suits in listOf(1, 2, 4)) {
            val s = SpiderEngine.newGame(suits, Random(3))
            assertEquals(104, total(s))
            assertEquals(50, s.stock.size)
            assertEquals(listOf(6, 6, 6, 6, 5, 5, 5, 5, 5, 5), s.tableau.map { it.size })
            assertTrue(s.tableau.all { it.last().faceUp && it.dropLast(1).none { c -> c.faceUp } })
            assertEquals(suits, (s.stock + s.tableau.flatten().map { it.card }).map { it.suit }.toSet().size)
            assertEquals(5, s.dealsLeft)
        }
    }

    @Test fun runMovesOnlyWhenSameSuitDescending() {
        val col0 = listOf(up(Rank.NINE, Suit.SPADES), up(Rank.EIGHT, Suit.SPADES))
        val col1 = listOf(up(Rank.TEN, Suit.HEARTS))
        val s = empty().copy(tableau = listOf(col0, col1) + List(8) { emptyList() })
        // 9♠ 8♠ is a run, can go on the 10 of another suit
        assertNotNull(SpiderEngine.apply(s, SpiderMove.MoveRun(0, 0, 1)))
        // mixed suits can't move as a group
        val mixed = s.copy(tableau = listOf(listOf(up(Rank.NINE, Suit.HEARTS), up(Rank.EIGHT, Suit.SPADES)), col1) + List(8) { emptyList() })
        assertNull(SpiderEngine.apply(mixed, SpiderMove.MoveRun(0, 0, 1)))
        // but the single bottom card can, onto a 9 of any suit
        val nineTarget = mixed.copy(tableau = mixed.tableau.mapIndexed { i, c -> if (i == 1) listOf(up(Rank.NINE, Suit.CLUBS)) else c })
        assertNotNull(SpiderEngine.apply(nineTarget, SpiderMove.MoveRun(0, 1, 1)))
        // wrong rank target
        assertNull(SpiderEngine.apply(s.copy(tableau = listOf(col0, listOf(up(Rank.JACK, Suit.HEARTS))) + List(8) { emptyList() }), SpiderMove.MoveRun(0, 0, 1)))
        // any card may go to an empty column
        assertNotNull(SpiderEngine.apply(s, SpiderMove.MoveRun(0, 0, 5)))
    }

    @Test fun completedRunIsRemovedAndUncoversCard() {
        val hidden = TableauCard(PlayingCard(Suit.HEARTS, Rank.TWO, "x"), false)
        val almost = listOf(hidden) + Rank.entries.reversed().dropLast(1).map { up(it) } // K, Q, ... 2 — only the Ace is missing
        val withAce = listOf(up(Rank.ACE))
        val s = empty().copy(tableau = listOf(almost, withAce) + List(8) { emptyList() })
        val moved = SpiderEngine.apply(s, SpiderMove.MoveRun(1, 0, 0))!!
        assertEquals(1, moved.completed)
        assertEquals(1, moved.tableau[0].size)
        assertTrue(moved.tableau[0].single().faceUp)
        assertTrue(moved.tableau[1].isEmpty())
    }

    @Test fun dealRulesAndEffect() {
        val s0 = SpiderEngine.newGame(1, Random(5))
        val dealt = SpiderEngine.apply(s0, SpiderMove.Deal)!!
        assertEquals(40, dealt.stock.size)
        assertTrue(dealt.tableau.indices.all { dealt.tableau[it].size == s0.tableau[it].size + 1 && dealt.tableau[it].last().faceUp })
        // no dealing while a column is empty
        val withGap = s0.copy(tableau = s0.tableau.mapIndexed { i, c -> if (i == 3) emptyList() else c })
        assertNull(SpiderEngine.apply(withGap, SpiderMove.Deal))
        assertTrue(SpiderEngine.dealBlockedByEmptyColumn(withGap))
        // no dealing with an empty stock
        assertNull(SpiderEngine.apply(s0.copy(stock = emptyList()), SpiderMove.Deal))
    }

    @Test fun randomPlayConservesCards() {
        repeat(20) { seed ->
            val random = Random(seed)
            var s = SpiderEngine.newGame(listOf(1, 2, 4)[seed % 3], random)
            repeat(400) {
                val moves = buildList<SpiderMove> {
                    add(SpiderMove.Deal)
                    for (from in 0 until 10) for (i in s.tableau[from].indices) for (to in 0 until 10) add(SpiderMove.MoveRun(from, i, to))
                }
                val legal = moves.mapNotNull { SpiderEngine.apply(s, it) }
                if (legal.isNotEmpty()) s = legal.random(random)
                assertEquals(104, total(s))
                assertTrue(s.tableau.all { it.isEmpty() || it.last().faceUp })
            }
        }
    }
}
