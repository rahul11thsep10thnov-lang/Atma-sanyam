package com.rangepatte.app.domain.game

import com.rangepatte.app.domain.model.PlayingCard
import kotlin.random.Random

/**
 * Imperative convenience wrapper around [Deck] for game engines that prefer to mutate a running
 * shoe (draw/deal/reset) rather than thread an immutable [Deck] through every call themselves.
 * Not thread-safe — each [CardGameEngine] owns and calls this from a single coroutine/thread.
 */
class DeckManager(private val deckCount: Int = 1) {

    var deck: Deck = createStandardDeck()
        private set

    fun createStandardDeck(): Deck =
        (if (deckCount == 1) Deck.standard() else Deck.multiple(deckCount)).also { deck = it }

    fun shuffle(random: Random = Random.Default): Deck {
        deck = deck.shuffled(random)
        return deck
    }

    /** Draws a single card from the top, or null if the shoe is empty. */
    fun drawCard(): PlayingCard? {
        val result = deck.draw() ?: return null
        val (card, remaining) = result
        deck = remaining
        return card
    }

    /**
     * Deals [handSize] cards to each of [playerCount] players, round-robin, from the current shoe.
     * Returns one hand per player, in player order. Throws if the shoe doesn't hold enough cards.
     */
    fun deal(playerCount: Int, handSize: Int): List<List<PlayingCard>> {
        require(playerCount > 0) { "playerCount must be positive" }
        val required = playerCount * handSize
        require(required <= deck.size) {
            "Cannot deal $handSize cards to $playerCount players from a shoe of ${deck.size}"
        }
        val hands = List(playerCount) { mutableListOf<PlayingCard>() }
        repeat(handSize) {
            for (playerIndex in 0 until playerCount) {
                val card = drawCard() ?: error("Shoe unexpectedly ran out while dealing")
                hands[playerIndex].add(card)
            }
        }
        return hands
    }

    fun resetDeck(shuffle: Boolean = true, random: Random = Random.Default): Deck {
        createStandardDeck()
        if (shuffle) shuffle(random)
        return deck
    }
}
