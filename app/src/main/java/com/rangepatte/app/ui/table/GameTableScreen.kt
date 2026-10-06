package com.rangepatte.app.ui.table

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.game.coatpiece.CoatPieceScreen
import com.rangepatte.app.game.coatpiece.CpState
import com.rangepatte.app.game.dehlapakad.DehlaPakadScreen
import com.rangepatte.app.game.dehlapakad.DpState
import com.rangepatte.app.game.lakadi.LakadiScreen
import com.rangepatte.app.game.lakadi.LkState
import com.rangepatte.app.game.rummy.RummyAction
import com.rangepatte.app.game.rummy.RummyScreen
import com.rangepatte.app.game.rummy.RummyState
import com.rangepatte.app.game.solitaire.SolitaireScreen
import com.rangepatte.app.game.spider.SpiderScreen
import com.rangepatte.app.game.teenpatti.TeenPattiScreen
import com.rangepatte.app.game.teenpatti.TpAction
import com.rangepatte.app.game.teenpatti.TpState
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.twentynine.T9State
import com.rangepatte.app.game.twentynine.TwentyNineScreen
import com.rangepatte.app.net.GameSession
import com.rangepatte.app.net.TableSessions

/**
 * Opens the table for [game]: each game has its own screen under `game/<name>/` (engine, AI and
 * layout), built on the shared card, frame and dialog pieces in `game/common/`. The two solitaires
 * are played alone; every other game plays through a [GameSession] — either one a lobby prepared for a
 * table with other people, or a solo table against the computer created here.
 */
@Composable
fun GameTableScreen(
    game: GameInfo,
    playerCount: Int,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    when (game.id) {
        GameId.SOLITAIRE -> SolitaireScreen(game, difficulty, onBackClick)
        GameId.SPIDER_SOLITAIRE -> SpiderScreen(game, difficulty, onBackClick)
        else -> {
            val youName = stringResource(R.string.player_you)
            val session = remember(game.id) {
                TableSessions.take() ?: TableSessions.solo(game.id, playerCount, difficulty, youName)
            }
            DisposableEffect(session) {
                session.start()
                onDispose { session.close() }
            }
            @Suppress("UNCHECKED_CAST")
            when (game.id) {
                GameId.RUMMY -> RummyScreen(game, session as GameSession<RummyState, RummyAction>, onBackClick)
                GameId.TEEN_PATTI -> TeenPattiScreen(game, session as GameSession<TpState, TpAction>, onBackClick)
                GameId.TWENTY_NINE -> TwentyNineScreen(game, session as GameSession<T9State, TrickAction>, onBackClick)
                GameId.COAT_PIECE -> CoatPieceScreen(game, session as GameSession<CpState, TrickAction>, onBackClick)
                GameId.DEHLA_PAKAD -> DehlaPakadScreen(game, session as GameSession<DpState, TrickAction>, onBackClick)
                GameId.LAKADI -> LakadiScreen(game, session as GameSession<LkState, TrickAction>, onBackClick)
                else -> Unit
            }
        }
    }
}
