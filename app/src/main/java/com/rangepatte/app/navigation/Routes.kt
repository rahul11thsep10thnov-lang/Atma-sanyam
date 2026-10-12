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
    const val FRIENDS = "friends"
    const val SETTINGS = "settings"
    const val LOGIN = "login"
    const val MEMBERSHIP = "membership"
    const val CHECKOUT = "checkout"
    const val USERNAME = "profile/username"
    const val ARG_EDIT = "edit"
    const val USERNAME_PATTERN = "profile/username?$ARG_EDIT={$ARG_EDIT}"
    /** Changing an existing username from My Profile (Element 16). */
    const val USERNAME_EDIT = "profile/username?edit=true"
    const val MY_PROFILE = "profile/me"

    /** Board games (Entertainment tab): each game's introduction page, by its route segment. */
    const val ARG_BOARD = "board"
    const val BOARD_INTRO_PATTERN = "board/{$ARG_BOARD}"
    fun boardIntro(segment: String) = "board/$segment"
    const val ARG_UID = "uid"
    const val PERSON_PATTERN = "person/{$ARG_UID}"
    fun person(uid: String) = "person/$uid"
    const val AVATAR = "profile/avatar"

    const val ARG_GAME_ID = "gameId"
    const val ARG_MODE = "mode"
    const val ARG_PLAYERS = "players"
    const val ARG_DIFFICULTY = "difficulty"
    const val SETUP_PATTERN = "setup/{$ARG_GAME_ID}"
    const val GAME_TABLE_PATTERN = "table/{$ARG_GAME_ID}/{$ARG_MODE}?$ARG_PLAYERS={$ARG_PLAYERS}&$ARG_DIFFICULTY={$ARG_DIFFICULTY}"

    const val ARG_ROLE = "role"
    const val ROLE_HOST = "host"
    const val ROLE_JOIN = "join"
    const val ARG_CODE = "code"
    const val LOBBY_PATTERN = "lobby/{$ARG_GAME_ID}/{$ARG_MODE}/{$ARG_ROLE}?$ARG_PLAYERS={$ARG_PLAYERS}&$ARG_DIFFICULTY={$ARG_DIFFICULTY}&$ARG_CODE={$ARG_CODE}"

    fun lobby(gameRouteSegment: String, mode: PlayMode, host: Boolean, playerCount: Int, difficulty: AiDifficulty, code: String? = null) =
        "lobby/$gameRouteSegment/${mode.name}/${if (host) ROLE_HOST else ROLE_JOIN}?$ARG_PLAYERS=$playerCount&$ARG_DIFFICULTY=${difficulty.name}&$ARG_CODE=${code.orEmpty()}"

    fun setup(gameRouteSegment: String) = "setup/$gameRouteSegment"
    fun gameTable(gameRouteSegment: String, mode: PlayMode, playerCount: Int, difficulty: AiDifficulty) =
        "table/$gameRouteSegment/${mode.name}?$ARG_PLAYERS=$playerCount&$ARG_DIFFICULTY=${difficulty.name}"

    /** The board itself (Ludo stage 3+), with the chosen mode. */
    const val BOARD_TABLE_PATTERN = "boardTable/{$ARG_BOARD}/{$ARG_MODE}"
    fun boardTable(segment: String, mode: PlayMode) = "boardTable/$segment/${mode.name}"
}
