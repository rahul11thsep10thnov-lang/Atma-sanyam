package com.rangepatte.app.domain.model

import com.rangepatte.app.domain.board.BoardCatalog

/**
 * The display name of any game a friend can be playing or invited to — the card games from
 * [GameCatalog] and the board games from [BoardCatalog] (Ludo stage 7). Every "playing X" and
 * "invites you to X" line looks names up here, so a board game is never shown by its enum name.
 */
object GameNames {
    fun nameRes(id: GameId): Int? =
        GameCatalog.all.firstOrNull { it.id == id }?.nameRes ?: BoardCatalog.all.firstOrNull { it.id.gameId == id }?.nameRes

    /** The route segment of a game, as the lobby routes expect it. */
    fun routeSegment(id: GameId): String = id.routeSegment

    /** True for a game that lives in the Entertainment tab and uses the board lobby route. */
    fun isBoardGame(routeSegment: String): Boolean = BoardCatalog.byRouteSegment(routeSegment) != null

    /** The games a friend can be invited to: every card game that takes play requests, then the board games. */
    fun invitable(): List<GameId> =
        GameCatalog.all.map { it.id }.filter { com.rangepatte.app.domain.presence.GameCapabilities.supportsPlayRequests(it) } +
            BoardCatalog.all.filter { it.isPlayable }.map { it.id.gameId }
}
