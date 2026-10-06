package com.rangepatte.app.game.tricks

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit
import kotlin.random.Random

/** The computer's card play, shared by every trick-taking game. */
object TrickAi {
    fun chooseCard(
        round: TrickRound,
        rules: TrickRules,
        difficulty: AiDifficulty,
        random: Random = Random.Default
    ): PlayingCard {
        val legal = TrickEngine.legal(round)
        if (legal.size == 1) return legal.single()
        val slip = when (difficulty) { AiDifficulty.EASY -> 0.25; AiDifficulty.MEDIUM -> 0.08; AiDifficulty.HARD -> 0.0 }
        if (random.nextDouble() < slip) return legal.random(random)

        val seat = round.turn
        val hand = round.hands[seat]
        fun isTrump(card: PlayingCard) = round.trumpActive && card.suit == round.trumpSuit
        val cheapest = compareBy<PlayingCard>({ isTrump(it) }, { rules.points(it) }, { rules.rank(it) })

        // Cards nobody has played yet and I don't hold — to tell which of my cards is now the highest left.
        val seen = (round.completed.flatMap { t -> t.plays.map { it.card } } + round.plays.map { it.card } + hand).toSet()
        val unseen = rules.deck.filter { it !in seen }
        fun isBoss(card: PlayingCard) = unseen.none { it.suit == card.suit && rules.rank(it) > rules.rank(card) }

        // Leading a trick.
        if (round.plays.isEmpty()) {
            val plain = legal.filter { !isTrump(it) }
            val bosses = plain.filter(::isBoss)
            return when {
                bosses.isNotEmpty() -> bosses.maxBy { rules.rank(it) }
                plain.isNotEmpty() -> plain.minWith(cheapest)
                else -> legal.minBy { rules.rank(it) }
            }
        }

        // Following: would this card win the trick as it stands?
        val revealsTrump = rules.mode == TrumpMode.HIDDEN && !round.trumpActive && TrickEngine.cannotFollow(round)
        fun wins(card: PlayingCard): Boolean = TrickEngine.winnerOf(
            round.plays + TrickPlay(seat, card), round.trumpSuit, round.trumpActive || revealsTrump, rules
        ) == seat

        val winnerNow = TrickEngine.currentWinner(round, rules)
        val partnerWinning = rules.hasPartners && winnerNow == TrickEngine.partnerOf(seat)
        val last = round.plays.size == TrickEngine.SEATS - 1

        if (partnerWinning) {
            val winningCard = round.plays.first { it.seat == winnerNow }.card
            val safe = last || (!isTrump(winningCard) && winningCard.suit == TrickEngine.ledSuit(round) && isBossAmongPlayed(winningCard, unseen, rules))
            return if (safe) {
                // Pass points to the partner's winning trick.
                legal.filter { !isTrump(it) }.ifEmpty { legal }.maxWith(compareBy<PlayingCard>({ rules.points(it) }, { -rules.rank(it) }))
            } else {
                legal.minWith(cheapest)
            }
        }

        val winners = legal.filter(::wins)
        if (winners.isNotEmpty()) {
            return winners.minWith(compareBy<PlayingCard>({ isTrump(it) }, { rules.rank(it) }))
        }
        return legal.minWith(cheapest)
    }

    private fun isBossAmongPlayed(card: PlayingCard, unseen: List<PlayingCard>, rules: TrickRules): Boolean =
        unseen.none { it.suit == card.suit && rules.rank(it) > rules.rank(card) }

    /** The suit this hand is strongest in: longest first, then most card points. */
    fun strongestSuit(hand: List<PlayingCard>, rules: TrickRules): Suit =
        Suit.entries.maxBy { suit ->
            val cards = hand.filter { it.suit == suit }
            cards.size * 100 + cards.sumOf { rules.points(it) } * 10 + (cards.maxOfOrNull { rules.rank(it) } ?: 0)
        }
}
