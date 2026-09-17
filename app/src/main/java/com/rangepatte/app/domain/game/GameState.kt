package com.rangepatte.app.domain.game

import com.rangepatte.app.domain.model.Player
import com.rangepatte.app.domain.model.PlayingCard

enum class GameStatus {
    NOT_STARTED,
    IN_PROGRESS,
    ROUND_OVER,
    GAME_OVER
}

/**
 * Common shape shared by every [CardGameEngine]'s state. Concrete engines (Teen Patti, Rummy, ...)
 * extend or wrap this with game-specific fields rather than growing it with optional properties —
 * see the per-game `*State` types added alongside each engine in later phases.
 */
data class GameState(
    val deck: List<PlayingCard> = emptyList(),
    val players: List<Player> = emptyList(),
    val currentPlayer: Int = 0,
    val gameStatus: GameStatus = GameStatus.NOT_STARTED,
    val winner: Int? = null,
    val score: Map<Int, Int> = emptyMap()
)

/** Marker interface for player/engine actions. Each game defines its own sealed hierarchy of these. */
interface GameAction
