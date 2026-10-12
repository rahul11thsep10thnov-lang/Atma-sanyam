package com.rangepatte.app.ui.board

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoSetup
import com.rangepatte.app.game.common.GameFrameChrome
import com.rangepatte.app.game.common.GameResultDialog

/**
 * The Ludo table (stage 3, Design 10): the approved board in the shared game frame, the players'
 * nameplates above it, the die and the Roll button below it. Dice and token animations are stage 4;
 * for now the die shows its face and a movable token glows.
 */
@Composable
fun LudoScreen(game: BoardGameInfo, setup: LudoSetup, onBackClick: () -> Unit) {
    val youName = stringResource(R.string.player_you)
    val youAvatar = com.rangepatte.app.AppServices.profile.profile.value?.avatarId
    val session = remember { LudoSession(setup, youName, listOf("Ravi", "Meera", "Gopal"), youAvatar) }
    DisposableEffect(session) { session.start(); onDispose { session.close() } }
    val state = session.state
    val pulse by rememberInfiniteTransition(label = "ludoPulse").animateFloat(0f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulse")
    val context = androidx.compose.ui.platform.LocalContext.current
    val reduceMotion = remember { runCatching { android.provider.Settings.Global.getFloat(context.contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }.getOrDefault(false) }
    val motion = rememberLudoMotion(state, session.shownDice, reduceMotion, onBusy = { session.busy = it })

    GameFrameChrome(
        title = stringResource(game.nameRes),
        rules = { onDismiss ->
            GameResultDialog(
                title = stringResource(R.string.action_rules),
                lines = listOf(R.string.ludo_rules_1, R.string.ludo_rules_2, R.string.ludo_rules_3, R.string.ludo_rules_4, R.string.ludo_rules_5).map { stringResource(it) },
                primaryText = stringResource(R.string.spectate_ok), onPrimary = onDismiss
            )
        },
        onBackClick = onBackClick
    ) {
        LudoTable(state = state, isMyTurn = session.isMyTurn && !motion.busy, shownDice = motion.die.face ?: session.shownDice, pulse = pulse, onRoll = session::roll, onMove = session::move, motion = motion.frame, die = motion.die)
    }

    if (state.phase == LudoPhase.OVER) {
        val ordinals = listOf(R.string.ludo_place_1, R.string.ludo_place_2, R.string.ludo_place_3, R.string.ludo_place_4).map { stringResource(it) }
        GameResultDialog(
            title = if (state.places.firstOrNull() == session.mySeat) stringResource(R.string.game_you_won) else stringResource(R.string.ludo_match_over),
            lines = state.places.mapIndexed { i, p -> "${ordinals[i]} · ${state.players[p].name}" },
            primaryText = stringResource(R.string.game_back_to_khel),
            onPrimary = onBackClick
        )
    }
}

