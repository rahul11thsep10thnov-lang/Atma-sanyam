package com.rangepatte.app.domain.model

/** The four standard suits. Kept in a fixed enum ordinal order used by sorting utilities. */
enum class Suit(val symbol: String, val isRed: Boolean) {
    SPADES("♠", isRed = false),
    HEARTS("♥", isRed = true),
    CLUBS("♣", isRed = false),
    DIAMONDS("♦", isRed = true)
}

/** Standard 13 ranks, ace-low ordinal order. Games that treat Ace as high sort with [Rank.order]. */
enum class Rank(val label: String, val value: Int) {
    ACE("A", 1),
    TWO("2", 2),
    THREE("3", 3),
    FOUR("4", 4),
    FIVE("5", 5),
    SIX("6", 6),
    SEVEN("7", 7),
    EIGHT("8", 8),
    NINE("9", 9),
    TEN("10", 10),
    JACK("J", 11),
    QUEEN("Q", 12),
    KING("K", 13);

    /** [value] with Ace treated as high (14) — convenience for games that rank Ace above King. */
    fun order(aceHigh: Boolean): Int = if (aceHigh && this == ACE) 14 else value
}

/**
 * A single playing card. [id] is unique per physical card in a multi-deck shoe (e.g. "S-A-0" for
 * the ace of spades from the first deck, "S-A-1" from the second) so UI layers can key on it even
 * when duplicate rank/suit combinations are in play.
 */
data class PlayingCard(
    val suit: Suit,
    val rank: Rank,
    val id: String = "${suit.name}-${rank.name}-0"
) {
    val isRed: Boolean get() = suit.isRed
    val displayLabel: String get() = "${rank.label}${suit.symbol}"
}
