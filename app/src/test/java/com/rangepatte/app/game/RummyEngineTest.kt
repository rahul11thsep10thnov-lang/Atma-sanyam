package com.rangepatte.app.game

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.rummy.MeldSession
import com.rangepatte.app.game.rummy.RCard
import com.rangepatte.app.game.rummy.RummyAi
import com.rangepatte.app.game.rummy.RummyEngine
import com.rangepatte.app.game.rummy.RummyPhase
import com.rangepatte.app.game.rummy.RummyState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class RummyEngineTest {
    private var nextId = 1000
    private fun c(rank: Rank, suit: Suit) = RCard(nextId++, suit, rank)
    private fun joker() = RCard(nextId++, null, null)
    private val noWild = Rank.TWO // chosen per test when it matters

    private fun session(cards: List<RCard>, wild: Rank) = MeldSession(cards, wild)

    @Test fun pureSequenceAndSet() {
        val hand = listOf(
            c(Rank.THREE, Suit.HEARTS), c(Rank.FOUR, Suit.HEARTS), c(Rank.FIVE, Suit.HEARTS), // pure
            c(Rank.SIX, Suit.SPADES), c(Rank.SEVEN, Suit.SPADES), joker(),                      // impure
            c(Rank.NINE, Suit.DIAMONDS), c(Rank.NINE, Suit.CLUBS), c(Rank.NINE, Suit.SPADES),   // set
            c(Rank.KING, Suit.HEARTS), c(Rank.KING, Suit.SPADES), c(Rank.KING, Suit.DIAMONDS), c(Rank.KING, Suit.CLUBS) // set of 4
        )
        val s = session(hand, Rank.ACE)
        assertTrue(s.canDeclare())
        assertEquals(0, s.penaltyPoints())
        assertEquals(0, s.arrange().cost)
    }

    @Test fun noPureSequenceMeansFullPenalty() {
        val hand = listOf(
            c(Rank.THREE, Suit.HEARTS), c(Rank.FOUR, Suit.HEARTS), joker(),   // impure only
            c(Rank.NINE, Suit.DIAMONDS), c(Rank.NINE, Suit.CLUBS), c(Rank.NINE, Suit.SPADES),
            c(Rank.KING, Suit.HEARTS), c(Rank.KING, Suit.SPADES), c(Rank.KING, Suit.DIAMONDS),
            c(Rank.TWO, Suit.CLUBS), c(Rank.FIVE, Suit.CLUBS), c(Rank.EIGHT, Suit.CLUBS), c(Rank.TEN, Suit.SPADES)
        )
        val s = session(hand, Rank.ACE)
        assertFalse(s.canDeclare())
        assertEquals(80, s.penaltyPoints())
    }

    @Test fun pureSequenceWithoutSecondSequenceOnlyProtectsThePure() {
        val hand = listOf(
            c(Rank.THREE, Suit.HEARTS), c(Rank.FOUR, Suit.HEARTS), c(Rank.FIVE, Suit.HEARTS),
            c(Rank.NINE, Suit.DIAMONDS), c(Rank.NINE, Suit.CLUBS), c(Rank.NINE, Suit.SPADES),
            c(Rank.KING, Suit.HEARTS), c(Rank.KING, Suit.SPADES), c(Rank.KING, Suit.DIAMONDS),
            c(Rank.TWO, Suit.CLUBS), c(Rank.SEVEN, Suit.CLUBS), c(Rank.EIGHT, Suit.DIAMONDS), c(Rank.JACK, Suit.SPADES)
        )
        val s = session(hand, Rank.ACE)
        assertFalse(s.canDeclare())
        // sets don't count without a second sequence: 27 + 30 + 2 + 7 + 8 + 10 = 84 -> capped at 80
        assertEquals(80, s.penaltyPoints())
    }

    @Test fun aceHighAndNoWraparound() {
        val queenKingAce = listOf(c(Rank.QUEEN, Suit.SPADES), c(Rank.KING, Suit.SPADES), c(Rank.ACE, Suit.SPADES))
        val aceLow = listOf(c(Rank.ACE, Suit.CLUBS), c(Rank.TWO, Suit.CLUBS), c(Rank.THREE, Suit.CLUBS))
        val wrap = listOf(c(Rank.KING, Suit.CLUBS), c(Rank.ACE, Suit.CLUBS), c(Rank.TWO, Suit.CLUBS))
        // pure sequences: cost is only the "no second sequence" penalty (12), no leftover and no "no pure" penalty
        assertEquals(12, session(queenKingAce, Rank.FIVE).arrange().cost)
        assertEquals(12, session(aceLow, Rank.FIVE).arrange().cost)
        // K A 2 is not a sequence: everything left over (10 + 1 + 2) plus both penalties
        assertEquals(13 + 25 + 12, session(wrap, Rank.FIVE).arrange().cost)
    }

    @Test fun wildRankCardsActAsJokersAndNaturally() {
        // wild rank = 7: 7♥ fills the gap in 5♠ 6♠ _ 8♠? use 5♠ 7♥(wild) 8♠? needs 6 -> 7♥ stands for 6♠
        val impure = listOf(c(Rank.FIVE, Suit.SPADES), c(Rank.SEVEN, Suit.HEARTS), c(Rank.SEVEN, Suit.SPADES))
        val s1 = session(impure, Rank.SEVEN)
        assertTrue(s1.arrange().leftover.isEmpty())
        assertEquals(25 + 12, s1.arrange().cost) // grouped, but it is no pure sequence and there is no second sequence
        // 7♥ 7♠ 7♦ natural set of the wild rank is still a set
        val set = listOf(c(Rank.SEVEN, Suit.HEARTS), c(Rank.SEVEN, Suit.SPADES), c(Rank.SEVEN, Suit.DIAMONDS))
        assertTrue(session(set, Rank.SEVEN).arrange().leftover.isEmpty())
        // 5♦ 6♦ 7♦ with wild=7 is still a PURE sequence (7♦ in its natural place)
        val pure = listOf(c(Rank.FIVE, Suit.DIAMONDS), c(Rank.SIX, Suit.DIAMONDS), c(Rank.SEVEN, Suit.DIAMONDS))
        assertEquals(12, session(pure, Rank.SEVEN).arrange().cost)
    }

    @Test fun twoJokersMakeAShortSequenceButNeedANatural() {
        val ok = listOf(c(Rank.NINE, Suit.HEARTS), joker(), joker())
        assertTrue(session(ok, Rank.TWO).arrange().leftover.isEmpty())
        val onlyJokers = listOf(joker(), joker(), joker())
        assertEquals(3, session(onlyJokers, Rank.TWO).arrange().leftover.size)
    }

    @Test fun newGameDealsCorrectly() {
        val s = RummyEngine.newGame(listOf("You", "A", "B"), Random(4))
        assertEquals(106, s.stock.size + s.discard.size + s.players.sumOf { it.hand.size })
        assertEquals(106, (s.stock + s.discard + s.players.flatMap { it.hand }).map { it.id }.toSet().size)
        assertTrue(s.players.all { it.hand.size == 13 })
        assertEquals(RummyPhase.DRAW, s.phase)
    }

    @Test fun drawDiscardCycleAndDeclare() {
        var s = RummyEngine.newGame(listOf("You", "A"), Random(8))
        s = RummyEngine.drawFromStock(s)!!
        assertEquals(14, s.current.hand.size)
        assertEquals(null, RummyEngine.drawFromStock(s)) // can't draw twice
        val throwAway = s.current.hand.first()
        val after = RummyEngine.discard(s, throwAway.id)!!
        assertEquals(1, after.turn)
        assertEquals(throwAway, after.discard.last())
        // a bogus declaration is punished
        val again = RummyEngine.drawFromDiscard(after)!!
        val declared = RummyEngine.declare(again, again.current.hand.first().id)!!
        assertEquals(RummyPhase.FINISHED, declared.phase)
        assertFalse(declared.result!!.validDeclaration)
        assertEquals(80, declared.result!!.points[1])
        assertEquals(0, declared.result!!.points[0])
    }

    @Test fun stockRecyclesFromDiscardPile() {
        var s = RummyEngine.newGame(listOf("You", "A"), Random(9))
        s = s.copy(stock = emptyList(), discard = s.stock.take(10))
        val drawn = RummyEngine.drawFromStock(s, Random(1))!!
        assertEquals(1, drawn.discard.size)
        assertEquals(8, drawn.stock.size) // 9 reshuffled, one drawn
    }

    @Test fun aiVersusAiFinishesWithoutCorruption() {
        var finished = 0
        val started = System.currentTimeMillis()
        repeat(12) { seed ->
            val random = Random(seed)
            var s: RummyState = RummyEngine.newGame(listOf("A", "B", "C"), random)
            var turns = 0
            while (s.phase != RummyPhase.FINISHED && turns < 300) {
                s = RummyAi.takeTurn(s, AiDifficulty.HARD, random)
                turns++
                val total = s.stock.size + s.discard.size + s.players.sumOf { it.hand.size }
                assertEquals(106, total)
                if (s.phase != RummyPhase.FINISHED) assertTrue(s.players.all { it.hand.size == 13 })
            }
            if (s.phase == RummyPhase.FINISHED) {
                finished++
                val r = s.result!!
                assertTrue(r.validDeclaration)
                assertEquals(0, r.points[r.declarer])
            }
        }
        println("AI rummy: $finished/12 games finished in ${System.currentTimeMillis() - started} ms")
        assertTrue("AI should finish at least some games", finished >= 1)
    }
}
