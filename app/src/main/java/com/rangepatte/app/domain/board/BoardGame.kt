package com.rangepatte.app.domain.board

import androidx.annotation.StringRes
import com.rangepatte.app.R

/** The board games in the Entertainment tab (Ludo stage 1). Kept apart from the card games' [com.rangepatte.app.domain.model.GameId]. */
enum class BoardGameId(val routeSegment: String) {
    LUDO("ludo")
}

data class BoardGameInfo(
    val id: BoardGameId,
    @StringRes val nameRes: Int,
    @StringRes val descriptionRes: Int,
    val minPlayers: Int,
    val maxPlayers: Int
)

object BoardCatalog {
    val all: List<BoardGameInfo> = listOf(
        BoardGameInfo(BoardGameId.LUDO, R.string.game_ludo_name, R.string.game_ludo_desc, 2, 4)
    )

    fun byRouteSegment(segment: String): BoardGameInfo? = all.firstOrNull { it.id.routeSegment == segment }
}
