package com.rangepatte.app.game.lakadi

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickAi
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickPlay
import kotlin.random.Random

object LakadiAi {
    /** A rough count of tricks this hand should take: top spades, aces, and kings with cover. */
    fun estimateTricks(hand: List<PlayingCard>): Double {
        var tricks = 0.0
        val spades = hand.filter { it.suit == Suit.SPADES }
        tricks += spades.count { it.rank == Rank.ACE || it.rank == Rank.KING || it.rank == Rank.QUEEN } * 0.9
        tricks += spades.count { it.rank == Rank.JACK || it.rank == Rank.TEN } * 0.4
        tricks += maxOf(0, spades.size - 3) * 0.7
        for (suit in listOf(Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS)) {
            val cards = hand.filter { it.suit == suit }
            if (cards.any { it.rank == Rank.ACE }) tricks += 0.9
            if (cards.any { it.rank == Rank.KING } && cards.size >= 2) tricks += 0.5
            if (cards.size <= 1 && spades.size >= 3) tricks += 0.4 // can ruff
        }
        return tricks
    }

    fun bid(state: LkState, difficulty: AiDifficulty, random: Random = Random.Default): Int {
        val estimate = estimateTricks(state.round.hands[state.bidTurn])
        val wobble = when (difficulty) { AiDifficulty.EASY -> random.nextInt(-1, 2); AiDifficulty.MEDIUM -> 0; AiDifficulty.HARD -> 0 }
        // Bid a little under the estimate: missing costs the whole bid, extra tricks only add 0.1.
        return (Math.floor(estimate - 0.3).toInt() + wobble).coerceIn(1, LakadiEngine.MAX_BID)
    }

    fun chooseCard(state: LkState, difficulty: AiDifficulty, random: Random = Random.Default): PlayingCard {
        val round = state.round
        val seat = round.turn
        val wonSoFar = round.completed.count { it.winner == seat }
        val wanted = state.bids[seat]
        val chosen = TrickAi.chooseCard(round, LakadiEngine.rules, difficulty, random)
        // Once the bid is made there's no point winning more tricks than needed: duck instead.
        if (wonSoFar >= wanted && round.plays.isNotEmpty()) {
            val legal = TrickEngine.legal(round)
            val ducks = legal.filter { c ->
                TrickEngine.winnerOf(round.plays + TrickPlay(seat, c), round.trumpSuit, true, LakadiEngine.rules) != seat
            }
            if (ducks.isNotEmpty()) return ducks.minBy { LakadiEngine.rules.rank(it) }
        }
        return chosen
    }
}
