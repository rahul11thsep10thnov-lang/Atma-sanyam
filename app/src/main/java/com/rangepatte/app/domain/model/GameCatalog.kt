package com.rangepatte.app.domain.model

import androidx.annotation.StringRes
import com.rangepatte.app.R

/** Stable identifier for each game — used as the navigation route segment and history key. */
enum class GameId(val routeSegment: String) {
    TEEN_PATTI("teenPatti"),
    FLUSH("flush"),
    COAT_PIECE("coatPiece"),
    TWENTY_NINE("twentyNine"),
    RUMMY("rummy"),
    DEHLA_PAKAD("dehlaPakad"),
    LAKADI("lakadi"),
    SOLITAIRE("solitaire"),
    SPIDER_SOLITAIRE("spiderSolitaire")
}

data class GameInfo(
    val id: GameId,
    @StringRes val nameRes: Int,
    @StringRes val descriptionRes: Int,
    val minPlayers: Int,
    val maxPlayers: Int,
    /** True once a real [com.rangepatte.app.domain.game.CardGameEngine] backs this game (Phase 7+). */
    val isPlayable: Boolean = false
)

/**
 * Static metadata for every game in the app. The Home/Games/Setup/Table/Rules screens all read
 * from this single catalog so adding a new game later means adding one entry here plus its engine
 * and screen — never touching the shell screens.
 */
object GameCatalog {
    val all: List<GameInfo> = listOf(
        GameInfo(GameId.TEEN_PATTI, R.string.game_teen_patti_name, R.string.game_teen_patti_desc, 3, 6),
        GameInfo(GameId.RUMMY, R.string.game_rummy_name, R.string.game_rummy_desc, 2, 6),
        GameInfo(GameId.TWENTY_NINE, R.string.game_twenty_nine_name, R.string.game_twenty_nine_desc, 4, 4),
        GameInfo(GameId.SOLITAIRE, R.string.game_solitaire_name, R.string.game_solitaire_desc, 1, 1),
        GameInfo(GameId.COAT_PIECE, R.string.game_coat_piece_name, R.string.game_coat_piece_desc, 4, 4),
        GameInfo(GameId.DEHLA_PAKAD, R.string.game_dehla_pakad_name, R.string.game_dehla_pakad_desc, 4, 4),
        GameInfo(GameId.LAKADI, R.string.game_lakadi_name, R.string.game_lakadi_desc, 4, 4),
        GameInfo(GameId.FLUSH, R.string.game_flush_name, R.string.game_flush_desc, 3, 6),
        GameInfo(GameId.SPIDER_SOLITAIRE, R.string.game_spider_solitaire_name, R.string.game_spider_solitaire_desc, 1, 1)
    )

    val featured: GameInfo get() = all.first { it.id == GameId.TEEN_PATTI }

    fun byId(id: GameId): GameInfo = all.first { it.id == id }

    fun byRouteSegment(segment: String): GameInfo? = all.firstOrNull { it.id.routeSegment == segment }
}
