package com.rangepatte.app.navigation

import com.rangepatte.app.domain.model.PlayMode

/**
 * Central route table. Per-game destinations (setup/table) are parameterized by [GameId] route
 * segment rather than one literal route per game, so adding a new game to
 * [com.rangepatte.app.domain.model.GameCatalog] is enough to make it navigable — no new route.
 *
 * Rules are shown as a popup ([com.rangepatte.app.ui.rules.RulesDialog]) over whichever screen
 * the player is on, not a separate navigated page — so there is deliberately no rules route here.
 */
object Routes {
    const val LANGUAGE_SELECT = "languageSelect"
    const val HOME = "home"
    const val GAMES = "games"
    const val HISTORY = "history"
    const val SETTINGS = "settings"

    const val ARG_GAME_ID = "gameId"
    const val ARG_MODE = "mode"
    const val SETUP_PATTERN = "setup/{$ARG_GAME_ID}"
    const val GAME_TABLE_PATTERN = "table/{$ARG_GAME_ID}/{$ARG_MODE}"

    fun setup(gameRouteSegment: String) = "setup/$gameRouteSegment"
    fun gameTable(gameRouteSegment: String, mode: PlayMode) = "table/$gameRouteSegment/${mode.name}"
}
