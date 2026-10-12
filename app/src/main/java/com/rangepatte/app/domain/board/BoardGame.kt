package com.rangepatte.app.domain.board

import androidx.annotation.StringRes
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.model.GameInfo

/**
 * The board games in the Entertainment tab (Ludo stage 1). Kept apart from the card games' catalog;
 * [gameId] is the entry the shared lobby, online rooms and presence carry for the game (stage 6).
 */
enum class BoardGameId(val routeSegment: String, val gameId: GameId) {
    LUDO("ludo", GameId.LUDO),
    SNAKES_LADDERS("snakesLadders", GameId.SNAKES_LADDERS)
}

data class BoardGameInfo(
    val id: BoardGameId,
    @StringRes val nameRes: Int,
    @StringRes val descriptionRes: Int,
    val minPlayers: Int,
    val maxPlayers: Int,
    /** A second, familiar name under the plaque ("Snakes & Ladders" under Moksha Patam); null for none. */
    @StringRes val altNameRes: Int? = null,
    /** False until the game's rules engine and table exist; the tile still opens its introduction page. */
    val isPlayable: Boolean = true
) {
    /** The same game as the card games' lobby and table plumbing see it. */
    fun asGameInfo(): GameInfo = GameInfo(id.gameId, nameRes, descriptionRes, minPlayers, maxPlayers, isPlayable = true)
}

object BoardCatalog {
    val all: List<BoardGameInfo> = listOf(
        BoardGameInfo(BoardGameId.LUDO, R.string.game_ludo_name, R.string.game_ludo_desc, 2, 4),
        BoardGameInfo(BoardGameId.SNAKES_LADDERS, R.string.game_snakes_name, R.string.game_snakes_desc, 2, 4, altNameRes = R.string.game_snakes_alt, isPlayable = false)
    )

    fun byRouteSegment(segment: String): BoardGameInfo? = all.firstOrNull { it.id.routeSegment == segment }
}
