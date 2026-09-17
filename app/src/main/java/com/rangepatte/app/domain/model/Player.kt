package com.rangepatte.app.domain.model

/** A seat at the table — human or AI — shared by every game engine. */
data class Player(
    val id: Int,
    val name: String,
    val isAI: Boolean = false,
    val difficulty: AiDifficulty? = null,
    val hand: List<PlayingCard> = emptyList()
)

enum class AiDifficulty {
    EASY,
    MEDIUM,
    HARD
}
