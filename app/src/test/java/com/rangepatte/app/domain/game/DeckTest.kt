package com.rangepatte.app.domain.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class DeckTest {

    @Test
    fun `standard deck has 52 unique cards`() {
        val deck = Deck.standard()
        assertEquals(52, deck.size)
        assertEquals(52, deck.cards.map { it.id }.toSet().size)
    }

    @Test
    fun `multiple decks scale card count and keep ids unique`() {
        val deck = Deck.multiple(2)
        assertEquals(104, deck.size)
        assertEquals(104, deck.cards.map { it.id }.toSet().size)
    }

    @Test
    fun `shuffle preserves the full set of cards`() {
        val original = Deck.standard()
        val shuffled = original.shuffled(Random(42))
        assertEquals(original.cards.toSet(), shuffled.cards.toSet())
        assertNotEquals(original.cards, shuffled.cards)
    }

    @Test
    fun `draw removes the top card and returns a smaller deck`() {
        val deck = Deck.standard()
        val (card, remaining) = deck.draw()!!
        assertEquals(deck.cards.first(), card)
        assertEquals(51, remaining.size)
    }

    @Test
    fun `draw on an empty deck returns null`() {
        val (_, remaining) = Deck.standard().draw(52)
        assertTrue(remaining.isEmpty)
        assertEquals(null, remaining.draw())
    }

    @Test
    fun `deckManager deal distributes cards round robin without duplicates`() {
        val manager = DeckManager()
        manager.resetDeck(shuffle = true, random = Random(7))
        val hands = manager.deal(playerCount = 4, handSize = 13)

        assertEquals(4, hands.size)
        hands.forEach { assertEquals(13, it.size) }

        val allDealt = hands.flatten()
        assertEquals(52, allDealt.size)
        assertEquals(52, allDealt.map { it.id }.toSet().size)
        assertEquals(0, manager.deck.size)
    }
}
