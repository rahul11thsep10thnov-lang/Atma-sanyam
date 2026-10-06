package com.rangepatte.app.ui.table

import androidx.compose.runtime.Composable
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.game.coatpiece.CoatPieceScreen
import com.rangepatte.app.game.dehlapakad.DehlaPakadScreen
import com.rangepatte.app.game.lakadi.LakadiScreen
import com.rangepatte.app.game.rummy.RummyScreen
import com.rangepatte.app.game.solitaire.SolitaireScreen
import com.rangepatte.app.game.spider.SpiderScreen
import com.rangepatte.app.game.teenpatti.TeenPattiScreen
import com.rangepatte.app.game.twentynine.TwentyNineScreen

/**
 * Opens the table for [game]: each game has its own screen under `game/<name>/` (engine, AI and
 * layout), built on the shared card, frame and dialog pieces in `game/common/`. Adding a game means
 * adding its package and one line here.
 */
@Composable
fun GameTableScreen(
    game: GameInfo,
    playMode: PlayMode,
    playerCount: Int,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    when (game.id) {
        GameId.SOLITAIRE -> SolitaireScreen(game, difficulty, onBackClick)
        GameId.SPIDER_SOLITAIRE -> SpiderScreen(game, difficulty, onBackClick)
        GameId.RUMMY -> RummyScreen(game, playMode, playerCount, difficulty, onBackClick)
        GameId.TEEN_PATTI -> TeenPattiScreen(game, playMode, playerCount, difficulty, onBackClick)
        GameId.TWENTY_NINE -> TwentyNineScreen(game, playMode, difficulty, onBackClick)
        GameId.COAT_PIECE -> CoatPieceScreen(game, playMode, difficulty, onBackClick)
        GameId.DEHLA_PAKAD -> DehlaPakadScreen(game, playMode, difficulty, onBackClick)
        GameId.LAKADI -> LakadiScreen(game, playMode, difficulty, onBackClick)
    }
}
