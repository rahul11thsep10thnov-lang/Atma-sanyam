package com.rangepatte.app.game

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.coatpiece.CoatPieceAi
import com.rangepatte.app.game.coatpiece.CoatPieceEngine
import com.rangepatte.app.game.coatpiece.CpPhase
import com.rangepatte.app.game.dehlapakad.DehlaPakadAi
import com.rangepatte.app.game.dehlapakad.DehlaPakadEngine
import com.rangepatte.app.game.dehlapakad.DpPhase
import com.rangepatte.app.game.lakadi.LakadiAi
import com.rangepatte.app.game.lakadi.LakadiEngine
import com.rangepatte.app.game.lakadi.LkPhase
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickPlay
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.tricks.TrickRules
import com.rangepatte.app.game.tricks.TrumpMode
import com.rangepatte.app.game.tricks.standardRank
import com.rangepatte.app.game.twentynine.T9Phase
import com.rangepatte.app.game.twentynine.TwentyNineAi
import com.rangepatte.app.game.twentynine.TwentyNineEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class TrickGamesTest {
    private fun c(rank: Rank, suit: Suit) = PlayingCard(suit, rank)
    private val plain = TrickRules(TrumpMode.FIXED, com.rangepatte.app.domain.game.Deck.standard().cards, ::standardRank)

    private fun round(hands: List<List<PlayingCard>>, trump: Suit?, active: Boolean = true, leader: Int = 0) =
        TrickEngine.newRound(hands, leader, trump, active)

    @Test fun mustFollowSuitWhenAble() {
        val r = round(listOf(
            listOf(c(Rank.FIVE, Suit.HEARTS), c(Rank.KING, Suit.SPADES)),
            listOf(c(Rank.TWO, Suit.SPADES), c(Rank.NINE, Suit.HEARTS)),
            listOf(c(Rank.THREE, Suit.CLUBS)), listOf(c(Rank.FOUR, Suit.CLUBS))
        ), Suit.CLUBS)
        val afterLead = TrickEngine.play(r, c(Rank.FIVE, Suit.HEARTS), plain)!!
        assertEquals(listOf(c(Rank.NINE, Suit.HEARTS)), TrickEngine.legal(afterLead))
        assertNull(TrickEngine.play(afterLead, c(Rank.TWO, Suit.SPADES), plain))
        assertNotNull(TrickEngine.play(afterLead, c(Rank.NINE, Suit.HEARTS), plain))
        // void in the led suit: anything goes
        var s = TrickEngine.play(afterLead, c(Rank.NINE, Suit.HEARTS), plain)!!
        assertEquals(2, s.turn)
        assertEquals(1, TrickEngine.legal(s).size)
    }

    @Test fun trumpBeatsLedSuitAndHighestWins() {
        val plays = listOf(
            TrickPlay(0, c(Rank.ACE, Suit.HEARTS)), TrickPlay(1, c(Rank.TWO, Suit.CLUBS)),
            TrickPlay(2, c(Rank.KING, Suit.HEARTS)), TrickPlay(3, c(Rank.THREE, Suit.CLUBS))
        )
        assertEquals(3, TrickEngine.winnerOf(plays, Suit.CLUBS, true, plain))   // highest trump
        assertEquals(0, TrickEngine.winnerOf(plays, Suit.CLUBS, false, plain))  // trump not active: led suit
        assertEquals(0, TrickEngine.winnerOf(plays, Suit.SPADES, true, plain))  // nobody played trump
    }

    @Test fun hiddenTrumpRevealsWhenSomeoneCannotFollow() {
        val rules = TrickRules(TrumpMode.HIDDEN, com.rangepatte.app.domain.game.Deck.standard().cards, ::standardRank)
        val r = round(listOf(
            listOf(c(Rank.FIVE, Suit.HEARTS)), listOf(c(Rank.NINE, Suit.HEARTS)),
            listOf(c(Rank.THREE, Suit.CLUBS)), listOf(c(Rank.FOUR, Suit.HEARTS))
        ), Suit.CLUBS, active = false)
        val s1 = TrickEngine.play(r, c(Rank.FIVE, Suit.HEARTS), rules)!!
        val s2 = TrickEngine.play(s1, c(Rank.NINE, Suit.HEARTS), rules)!!
        assertFalse(s2.trumpActive)
        val s3 = TrickEngine.play(s2, c(Rank.THREE, Suit.CLUBS), rules)!!
        assertTrue("void player reveals the hidden trump", s3.trumpActive)
        val s4 = TrickEngine.play(s3, c(Rank.FOUR, Suit.HEARTS), rules)!!
        assertEquals(2, TrickEngine.currentWinner(s4, rules))
    }

    @Test fun calledByVoidRequiresACallFirst() {
        val rules = TrickRules(TrumpMode.CALLED_BY_VOID, com.rangepatte.app.domain.game.Deck.standard().cards, ::standardRank)
        val r = round(listOf(
            listOf(c(Rank.FIVE, Suit.HEARTS)), listOf(c(Rank.NINE, Suit.CLUBS)),
            listOf(c(Rank.THREE, Suit.CLUBS)), listOf(c(Rank.FOUR, Suit.HEARTS))
        ), null, active = false)
        val s1 = TrickEngine.play(r, c(Rank.FIVE, Suit.HEARTS), rules)!!
        assertTrue(TrickEngine.needsTrumpCall(s1, rules))
        assertNull(TrickEngine.play(s1, c(Rank.NINE, Suit.CLUBS), rules))
        val called = TrickEngine.callTrump(s1, Suit.CLUBS)
        assertNotNull(TrickEngine.play(called, c(Rank.NINE, Suit.CLUBS), rules))
    }

    @Test fun coatPieceFullRoundsWithAi() {
        repeat(25) { seed ->
            val random = Random(seed)
            var s = CoatPieceEngine.newRound(dealer = seed % 4, courts = listOf(0, 0), random = random)
            assertEquals(5, s.callerFirstFive.size)
            s = CoatPieceEngine.callTrump(s, CoatPieceAi.chooseTrump(s))
            var plays = 0
            while (s.phase == CpPhase.PLAYING) {
                if (TrickEngine.isTrickComplete(s.round)) { s = CoatPieceEngine.resolveTrick(s); continue }
                val card = CoatPieceAi.chooseCard(s, AiDifficulty.entries[seed % 3], random)
                s = CoatPieceEngine.play(s, card) ?: error("AI chose an illegal card")
                plays++
            }
            assertEquals(52, plays)
            assertEquals(13, s.tricksByTeam.sum())
            assertEquals(1, s.courts.sum())
            assertTrue(s.tricksByTeam[s.roundWinnerTeam!!] >= 7)
        }
    }

    @Test fun twentyNineBidsAndScoresAddUp() {
        repeat(40) { seed ->
            val random = Random(seed)
            var s = TwentyNineEngine.newRound(dealer = seed % 4, gameScore = listOf(0, 0), random = random)
            assertEquals(32, s.firstHands.sumOf { it.size } + s.secondHands.sumOf { it.size })
            while (s.phase == T9Phase.BIDDING) {
                val amount = TwentyNineAi.bid(s, AiDifficulty.entries[seed % 3], random)
                s = TwentyNineEngine.bid(s, amount) ?: error("illegal bid $amount (min ${TwentyNineEngine.minBid(s)})")
            }
            assertTrue(s.highBid in 15..28)
            s = TwentyNineEngine.chooseTrump(s, TwentyNineAi.chooseTrump(s))!!
            var plays = 0
            while (s.phase == T9Phase.PLAYING) {
                if (TrickEngine.isTrickComplete(s.round!!)) { s = TwentyNineEngine.resolveTrick(s); continue }
                s = TwentyNineEngine.play(s, TwentyNineAi.chooseCard(s, AiDifficulty.entries[seed % 3], random)) ?: error("illegal card")
                plays++
            }
            assertEquals(32, plays)
            assertEquals("all 28 card points are won by someone", 28, s.teamPoints.sum())
            assertEquals(0, s.gameScore.sum())
            assertEquals(s.result!!.made, s.teamPoints[s.bidderTeam] >= s.highBid)
        }
    }

    @Test fun twentyNineBidRules() {
        var s = TwentyNineEngine.newRound(3, listOf(0, 0), Random(1))
        assertEquals(0, s.bidTurn)
        assertNull(TwentyNineEngine.bid(s, 14))
        assertNull(TwentyNineEngine.bid(s, 29))
        s = TwentyNineEngine.bid(s, 17)!!
        assertEquals(18, TwentyNineEngine.minBid(s))
        assertNull(TwentyNineEngine.bid(s, 17))
        s = TwentyNineEngine.bid(s, 0)!!
        s = TwentyNineEngine.bid(s, 0)!!
        s = TwentyNineEngine.bid(s, 0)!!
        assertEquals(T9Phase.TRUMP_CHOICE, s.phase)
        assertEquals(0, s.highBidder)
        // everyone passes: dealer takes 15
        var allPass = TwentyNineEngine.newRound(2, listOf(0, 0), Random(2))
        repeat(4) { allPass = TwentyNineEngine.bid(allPass, 0)!! }
        assertEquals(2, allPass.highBidder)
        assertEquals(15, allPass.highBid)
    }

    @Test fun dehlaPakadHandsAccountForEveryCardAndTen() {
        repeat(40) { seed ->
            val random = Random(seed)
            var s = DehlaPakadEngine.newRound(dealer = seed % 4, handsWon = listOf(0, 0), streakTeam = null, streak = 0, random = random)
            var plays = 0
            while (s.phase == DpPhase.PLAYING) {
                if (TrickEngine.isTrickComplete(s.round)) { s = DehlaPakadEngine.resolveTrick(s); continue }
                if (DehlaPakadEngine.needsTrumpCall(s)) { s = DehlaPakadEngine.callTrump(s, DehlaPakadAi.chooseTrump(s)); continue }
                s = DehlaPakadEngine.play(s, DehlaPakadAi.chooseCard(s, AiDifficulty.entries[seed % 3], random)) ?: error("illegal card")
                plays++
            }
            assertEquals(52, plays)
            assertEquals(52, s.teamCards.sum())
            assertEquals(4, s.teamTens.sum())
            assertTrue(s.pile.isEmpty())
            assertEquals(1, s.handsWon.sum())
            val result = s.result!!
            assertEquals(result.kot, s.teamTens[result.winnerTeam] == 4)
        }
    }

    @Test fun dehlaPakadPileIsTakenOnlyOnTwoInARow() {
        val rules = DehlaPakadEngine.rules
        // seat 0 wins two tricks in a row -> first pile (4) + second (4) collected after the second trick
        val hands = listOf(
            listOf(c(Rank.ACE, Suit.SPADES), c(Rank.KING, Suit.SPADES), c(Rank.TWO, Suit.CLUBS)),
            listOf(c(Rank.TWO, Suit.SPADES), c(Rank.THREE, Suit.SPADES), c(Rank.THREE, Suit.CLUBS)),
            listOf(c(Rank.FOUR, Suit.SPADES), c(Rank.FIVE, Suit.SPADES), c(Rank.FOUR, Suit.CLUBS)),
            listOf(c(Rank.SIX, Suit.SPADES), c(Rank.TEN, Suit.SPADES), c(Rank.FIVE, Suit.CLUBS))
        )
        var s = DehlaPakadEngine.newMatch(Random(1)).copy(round = TrickEngine.newRound(hands, 0, null, false))
        fun playTrick(cards: List<PlayingCard>) {
            for (card in cards) s = DehlaPakadEngine.play(s, card)!!
            s = DehlaPakadEngine.resolveTrick(s)
        }
        playTrick(listOf(c(Rank.ACE, Suit.SPADES), c(Rank.TWO, Suit.SPADES), c(Rank.FOUR, Suit.SPADES), c(Rank.SIX, Suit.SPADES)))
        assertEquals(4, s.pile.size)
        assertEquals(listOf(0, 0), s.teamCards)
        playTrick(listOf(c(Rank.KING, Suit.SPADES), c(Rank.THREE, Suit.SPADES), c(Rank.FIVE, Suit.SPADES), c(Rank.TEN, Suit.SPADES)))
        assertEquals(0, s.pile.size)
        assertEquals(listOf(8, 0), s.teamCards)
        assertEquals(listOf(1, 0), s.teamTens)
        assertNotNull(rules)
    }

    @Test fun lakadiScoringAndFullGame() {
        assertEquals(30, LakadiEngine.scoreFor(3, 3))
        assertEquals(32, LakadiEngine.scoreFor(3, 5))
        assertEquals(-40, LakadiEngine.scoreFor(4, 3))
        assertEquals("3.2", LakadiEngine.format(32))
        assertEquals("-4", LakadiEngine.format(-40))
        assertEquals("-0.5", LakadiEngine.format(-5))
        assertEquals("0", LakadiEngine.format(0))

        repeat(10) { seed ->
            val random = Random(seed)
            var s = LakadiEngine.newGame(random)
            var hands = 0
            while (s.phase != LkPhase.GAME_OVER) {
                while (s.phase == LkPhase.BIDDING) s = LakadiEngine.bid(s, LakadiAi.bid(s, AiDifficulty.HARD, random))!!
                var plays = 0
                while (s.phase == LkPhase.PLAYING) {
                    if (TrickEngine.isTrickComplete(s.round)) { s = LakadiEngine.resolveTrick(s); continue }
                    s = LakadiEngine.play(s, LakadiAi.chooseCard(s, AiDifficulty.entries[seed % 3], random)) ?: error("illegal card")
                    plays++
                }
                assertEquals(52, plays)
                assertEquals(13, TrickEngine.tricksWonBySeat(s.round).sum())
                hands++
                if (s.phase == LkPhase.HAND_OVER) s = LakadiEngine.nextHand(s, random)
            }
            assertEquals(5, hands)
            assertEquals(5, s.handNumber)
        }
    }
}
