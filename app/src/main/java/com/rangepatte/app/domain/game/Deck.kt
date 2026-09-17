package com.rangepatte.app.domain.game

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import kotlin.random.Random

/**
 * An immutable, ordered stack of cards. The top of the deck is the head of [cards].
 * Mutating operations return a new [Deck] rather than modifying this one in place, matching the
 * app-wide preference for immutable state flowing through [kotlinx.coroutines.flow.StateFlow].
 */
data class Deck(val cards: List<PlayingCard>) {

    val size: Int get() = cards.size
    val isEmpty: Boolean get() = cards.isEmpty()

    fun shuffled(random: Random = Random.Default): Deck = Deck(cards.shuffled(random))

    /** Removes and returns the top card, or null if the deck is empty. */
    fun draw(): Pair<PlayingCard, Deck>? {
        val top = cards.firstOrNull() ?: return null
        return top to Deck(cards.drop(1))
    }

    /** Removes and returns the top [count] cards. Throws if fewer than [count] remain. */
    fun draw(count: Int): Pair<List<PlayingCard>, Deck> {
        require(count <= cards.size) { "Cannot draw $count cards from a deck of $size" }
        return cards.take(count) to Deck(cards.drop(count))
    }

    fun withCardOnTop(card: PlayingCard): Deck = Deck(listOf(card) + cards)

    fun withCardsAdded(newCards: List<PlayingCard>): Deck = Deck(cards + newCards)

    companion object {
        /** A single standard 52-card deck, unshuffled, in Suit/Rank enum order. */
        fun standard(): Deck = Deck(
            Suit.entries.flatMap { suit ->
                Rank.entries.map { rank -> PlayingCard(suit, rank) }
            }
        )

        /**
         * [deckCount] standard decks merged together, with each card's [PlayingCard.id] suffixed
         * by its source deck index so duplicates remain distinguishable (used by Rummy variants
         * that play with two decks, and by multi-deck trick games).
         */
        fun multiple(deckCount: Int): Deck {
            require(deckCount >= 1) { "deckCount must be at least 1" }
            val allCards = (0 until deckCount).flatMap { deckIndex ->
                Suit.entries.flatMap { suit ->
                    Rank.entries.map { rank ->
                        PlayingCard(suit, rank, id = "${suit.name}-${rank.name}-$deckIndex")
                    }
                }
            }
            return Deck(allCards)
        }
    }
}
