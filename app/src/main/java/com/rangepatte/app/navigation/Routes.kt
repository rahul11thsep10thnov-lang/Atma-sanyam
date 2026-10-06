package com.rangepatte.app.navigation

import com.rangepatte.app.domain.model.AiDifficulty
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
    const val GAMES = "games"
    const val ENTERTAINMENT = "entertainment"
    const val SETTINGS = "settings"
    const val LOGIN = "login"
    const val MEMBERSHIP = "membership"
    const val CHECKOUT = "checkout"

    const val ARG_GAME_ID = "gameId"
    const val ARG_MODE = "mode"
    const val ARG_PLAYERS = "players"
    const val ARG_DIFFICULTY = "difficulty"
    const val SETUP_PATTERN = "setup/{$ARG_GAME_ID}"
    const val GAME_TABLE_PATTERN = "table/{$ARG_GAME_ID}/{$ARG_MODE}?$ARG_PLAYERS={$ARG_PLAYERS}&$ARG_DIFFICULTY={$ARG_DIFFICULTY}"

    const val ARG_ROLE = "role"
    const val ROLE_HOST = "host"
    const val ROLE_JOIN = "join"
    const val LOBBY_PATTERN = "lobby/{$ARG_GAME_ID}/{$ARG_MODE}/{$ARG_ROLE}?$ARG_PLAYERS={$ARG_PLAYERS}&$ARG_DIFFICULTY={$ARG_DIFFICULTY}"

    fun lobby(gameRouteSegment: String, mode: PlayMode, host: Boolean, playerCount: Int, difficulty: AiDifficulty) =
        "lobby/$gameRouteSegment/${mode.name}/${if (host) ROLE_HOST else ROLE_JOIN}?$ARG_PLAYERS=$playerCount&$ARG_DIFFICULTY=${difficulty.name}"

    fun setup(gameRouteSegment: String) = "setup/$gameRouteSegment"
    fun gameTable(gameRouteSegment: String, mode: PlayMode, playerCount: Int, difficulty: AiDifficulty) =
        "table/$gameRouteSegment/${mode.name}?$ARG_PLAYERS=$playerCount&$ARG_DIFFICULTY=${difficulty.name}"
}
