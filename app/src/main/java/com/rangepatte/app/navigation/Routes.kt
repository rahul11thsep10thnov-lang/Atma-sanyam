package com.rangepatte.app.navigation

/**
 * Central route table. Per-game destinations (setup/table/rules) are parameterized by [GameId]
 * route segment rather than one literal route per game, so adding a new game to
 * [com.rangepatte.app.domain.model.GameCatalog] is enough to make it navigable — no new route.
 */
object Routes {
    const val HOME = "home"
    const val GAMES = "games"
    const val HISTORY = "history"
    const val SETTINGS = "settings"

    const val ARG_GAME_ID = "gameId"
    const val SETUP_PATTERN = "setup/{$ARG_GAME_ID}"
    const val GAME_TABLE_PATTERN = "table/{$ARG_GAME_ID}"
    const val RULES_PATTERN = "rules/{$ARG_GAME_ID}"

    fun setup(gameRouteSegment: String) = "setup/$gameRouteSegment"
    fun gameTable(gameRouteSegment: String) = "table/$gameRouteSegment"
    fun rules(gameRouteSegment: String) = "rules/$gameRouteSegment"
}
