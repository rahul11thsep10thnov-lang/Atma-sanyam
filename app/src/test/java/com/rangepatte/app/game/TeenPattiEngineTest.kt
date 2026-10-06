package com.rangepatte.app.game

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.teenpatti.HandCategory
import com.rangepatte.app.game.teenpatti.TeenPattiAi
import com.rangepatte.app.game.teenpatti.TeenPattiEngine
import com.rangepatte.app.game.teenpatti.TeenPattiRanking
import com.rangepatte.app.game.teenpatti.TpPhase
import com.rangepatte.app.game.teenpatti.TpState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class TeenPattiEngineTest {
    private fun h(vararg c: Pair<Rank, Suit>) = c.map { PlayingCard(it.second, it.first) }
    private fun rank(vararg c: Pair<Rank, Suit>) = TeenPattiRanking.evaluate(h(*c))
    private infix fun Rank.of(s: Suit) = this to s

    @Test fun categoriesAreOrdered() {
        val trail = rank(Rank.TWO of Suit.SPADES, Rank.TWO of Suit.HEARTS, Rank.TWO of Suit.CLUBS)
        val pure = rank(Rank.FIVE of Suit.HEARTS, Rank.FOUR of Suit.HEARTS, Rank.SIX of Suit.HEARTS)
        val seq = rank(Rank.ACE of Suit.HEARTS, Rank.KING of Suit.SPADES, Rank.QUEEN of Suit.CLUBS)
        val color = rank(Rank.ACE of Suit.CLUBS, Rank.NINE of Suit.CLUBS, Rank.THREE of Suit.CLUBS)
        val pair = rank(Rank.ACE of Suit.CLUBS, Rank.ACE of Suit.SPADES, Rank.THREE of Suit.HEARTS)
        val high = rank(Rank.ACE of Suit.CLUBS, Rank.NINE of Suit.SPADES, Rank.THREE of Suit.HEARTS)
        assertEquals(listOf(HandCategory.TRAIL, HandCategory.PURE_SEQUENCE, HandCategory.SEQUENCE, HandCategory.COLOR, HandCategory.PAIR, HandCategory.HIGH_CARD),
            listOf(trail, pure, seq, color, pair, high).map { it.category })
        assertTrue(trail > pure && pure > seq && seq > color && color > pair && pair > high)
    }

    @Test fun sequenceOrderingIncludesAceLowSpecialCase() {
        val akq = rank(Rank.ACE of Suit.HEARTS, Rank.KING of Suit.SPADES, Rank.QUEEN of Suit.CLUBS)
        val a23 = rank(Rank.ACE of Suit.HEARTS, Rank.TWO of Suit.SPADES, Rank.THREE of Suit.CLUBS)
        val kqj = rank(Rank.KING of Suit.HEARTS, Rank.QUEEN of Suit.SPADES, Rank.JACK of Suit.CLUBS)
        val low = rank(Rank.FOUR of Suit.HEARTS, Rank.THREE of Suit.SPADES, Rank.TWO of Suit.CLUBS)
        assertTrue(akq > a23 && a23 > kqj && kqj > low)
        assertEquals(HandCategory.SEQUENCE, a23.category)
        // K-A-2 is NOT a run
        assertEquals(HandCategory.HIGH_CARD, rank(Rank.KING of Suit.HEARTS, Rank.ACE of Suit.SPADES, Rank.TWO of Suit.CLUBS).category)
    }

    @Test fun tieBreaksWithinCategory() {
        assertTrue(rank(Rank.ACE of Suit.CLUBS, Rank.ACE of Suit.SPADES, Rank.TWO of Suit.HEARTS) > rank(Rank.KING of Suit.CLUBS, Rank.KING of Suit.SPADES, Rank.QUEEN of Suit.HEARTS))
        assertTrue(rank(Rank.KING of Suit.CLUBS, Rank.KING of Suit.SPADES, Rank.QUEEN of Suit.HEARTS) > rank(Rank.KING of Suit.CLUBS, Rank.KING of Suit.SPADES, Rank.JACK of Suit.HEARTS))
        assertTrue(rank(Rank.ACE of Suit.CLUBS, Rank.NINE of Suit.CLUBS, Rank.THREE of Suit.CLUBS) > rank(Rank.ACE of Suit.HEARTS, Rank.EIGHT of Suit.HEARTS, Rank.SEVEN of Suit.HEARTS))
        assertEquals(0, rank(Rank.ACE of Suit.CLUBS, Rank.NINE of Suit.SPADES, Rank.THREE of Suit.HEARTS).compareTo(rank(Rank.ACE of Suit.HEARTS, Rank.NINE of Suit.CLUBS, Rank.THREE of Suit.DIAMONDS)))
    }

    private fun total(s: TpState) = s.pot + s.seats.sumOf { it.chips }

    @Test fun bootAndBettingFlow() {
        var s = TeenPattiEngine.newMatch(listOf("You", "A", "B"), Random(1))
        assertEquals(30, s.pot)
        assertEquals(3000, total(s))
        assertTrue(s.seats.all { it.chips == 990 && it.hand.size == 3 })
        val first = s.turn
        // blind chaal costs half the stake, seen chaal the full stake
        assertEquals(5, TeenPattiEngine.chaalCost(s))
        val seenState = TeenPattiEngine.see(s)!!
        assertEquals(10, TeenPattiEngine.chaalCost(seenState))
        assertNull(TeenPattiEngine.see(seenState))
        s = TeenPattiEngine.chaal(s)!!
        assertEquals(35, s.pot)
        assertEquals((first + 1) % 3, s.turn)
        // raising doubles the stake; blind pays half of the new stake
        s = TeenPattiEngine.raise(s)!!
        assertEquals(20, s.stake)
        assertEquals(35 + 10, s.pot)
        assertEquals(3000, total(s))
    }

    @Test fun lastPlayerStandingWinsWithoutShow() {
        var s = TeenPattiEngine.newMatch(listOf("You", "A", "B"), Random(2))
        s = TeenPattiEngine.pack(s)!!
        assertEquals(TpPhase.BETTING, s.phase)
        val survivorTurn = s.turn
        s = TeenPattiEngine.pack(s)!!
        assertEquals(TpPhase.ENDED, s.phase)
        assertFalse(s.result!!.showdown)
        assertEquals(30, s.result!!.pot)
        assertEquals(3000, total(s))
        assertEquals(990 + 30, s.seats[s.result!!.winner].chips)
        assertTrue(s.seats[s.result!!.winner].packed.not())
        assertNotNull(survivorTurn)
    }

    @Test fun showComparesAndTieLosesForTheAsker() {
        var s = TeenPattiEngine.newMatch(listOf("You", "A", "B"), Random(3))
        s = TeenPattiEngine.pack(s)!!
        assertFalse(TeenPattiEngine.canShow(s)) // hasn't seen cards
        s = TeenPattiEngine.see(s)!!
        assertTrue(TeenPattiEngine.canShow(s))
        val asker = s.turn
        val other = s.seats.indices.first { it != asker && !s.seats[it].packed }
        // force a tie
        val hand = s.seats[asker].hand
        val tied = s.copy(seats = s.seats.mapIndexed { i, seat -> if (i == other) seat.copy(hand = hand) else seat })
        val ended = TeenPattiEngine.show(tied)!!
        assertTrue(ended.result!!.showdown)
        assertEquals(other, ended.result!!.winner)
        // a stronger asker wins
        val strong = s.copy(seats = s.seats.mapIndexed { i, seat ->
            when (i) {
                asker -> seat.copy(hand = h(Rank.ACE of Suit.SPADES, Rank.ACE of Suit.HEARTS, Rank.ACE of Suit.CLUBS))
                other -> seat.copy(hand = h(Rank.KING of Suit.SPADES, Rank.QUEEN of Suit.HEARTS, Rank.NINE of Suit.CLUBS))
                else -> seat
            }
        })
        assertEquals(asker, TeenPattiEngine.show(strong)!!.result!!.winner)
    }

    @Test fun stakeIsCappedAndBrokePlayersCannotCall() {
        var s = TeenPattiEngine.newMatch(listOf("You", "A", "B"), Random(4))
        s = s.copy(stake = TeenPattiEngine.MAX_STAKE)
        assertFalse(TeenPattiEngine.canRaise(s))
        assertNull(TeenPattiEngine.raise(s))
        val broke = s.copy(seats = s.seats.mapIndexed { i, seat -> if (i == s.turn) seat.copy(chips = 1, seen = true) else seat })
        assertFalse(TeenPattiEngine.canChaal(broke))
        assertNull(TeenPattiEngine.chaal(broke))
        assertNotNull(TeenPattiEngine.pack(broke))
    }

    @Test fun nextHandKeepsChipsAndRotatesDealer() {
        var s = TeenPattiEngine.newMatch(listOf("You", "A", "B", "C"), Random(5))
        s = TeenPattiEngine.pack(s)!!; s = TeenPattiEngine.pack(s)!!; s = TeenPattiEngine.pack(s)!!
        assertEquals(TpPhase.ENDED, s.phase)
        val before = s.seats.map { it.chips }
        val next = TeenPattiEngine.nextHand(s, Random(6))!!
        assertEquals(2, next.handNumber)
        assertEquals((s.dealer + 1) % 4, next.dealer)
        assertEquals(before.map { it - TeenPattiEngine.BOOT }, next.seats.map { it.chips })
        val ruined = s.copy(seats = s.seats.mapIndexed { i, seat -> if (seat.isHuman) seat.copy(chips = 3) else seat })
        assertNull(TeenPattiEngine.nextHand(ruined))
    }

    @Test fun aiVersusAiAlwaysEndsAndConservesPoints() {
        var showdowns = 0
        repeat(150) { seed ->
            val random = Random(seed)
            var s = TeenPattiEngine.newMatch(listOf("A", "B", "C", "D", "E").take(3 + seed % 3), random)
            val startTotal = total(s)
            var steps = 0
            while (s.phase == TpPhase.BETTING && steps < 600) {
                s = TeenPattiAi.takeAction(s, AiDifficulty.entries[seed % 3], random)
                steps++
                assertEquals(startTotal, total(s))
                assertTrue(s.seats.all { it.chips >= 0 })
            }
            assertEquals("hand $seed did not finish", TpPhase.ENDED, s.phase)
            if (s.result!!.showdown) showdowns++
        }
        println("AI teen patti: $showdowns/150 hands reached a show")
    }
}
