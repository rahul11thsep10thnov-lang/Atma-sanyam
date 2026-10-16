package com.rangepatte.app.ui.snakes

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.presence.Activity
import com.rangepatte.app.domain.snakes.SnakesAction
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesSetup
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.game.common.ConnectionLostDialog
import com.rangepatte.app.game.common.GameFrameChrome
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.ReconnectBand
import com.rangepatte.app.net.GameSession
import com.rangepatte.app.net.TableSessions
import kotlinx.coroutines.delay

/** The Moksha Patam table: the solo session or the lobby's lockstep table through one controller face, like Ludo. */
@Composable
fun SnakesScreen(game: BoardGameInfo, setup: SnakesSetup, onBackClick: () -> Unit) {
    val youName = stringResource(R.string.player_you)
    val youAvatar = AppServices.profile.profile.value?.avatarId
    val table: SnakesTableController = remember {
        @Suppress("UNCHECKED_CAST")
        val offered = TableSessions.take()?.takeIf { it.machine.gameId == GameId.SNAKES_LADDERS } as GameSession<SnakesState, SnakesAction>?
        if (offered != null) SnakesOnlineTable(offered) else SnakesSession(setup, youName, listOf("Ravi", "Meera", "Gopal"), youAvatar)
    }
    DisposableEffect(table) {
        table.start()
        val online = table as? SnakesOnlineTable
        AppServices.presence.setActivity(Activity(GameId.SNAKES_LADDERS, tableCode = online?.tableCode, seatsFree = 0))
        onDispose { table.close(); AppServices.presence.setActivity(null) }
    }
    val state = table.state
    val pulse by rememberInfiniteTransition(label = "snakesPulse").animateFloat(0f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulse")
    val context = androidx.compose.ui.platform.LocalContext.current
    val reduceMotion = remember { com.rangepatte.app.ui.motion.MotionPrefs.reduceMotion(context) }
    val motion = rememberSnakesMotion(state, reduceMotion, onBusy = { table.busy = it })
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    val counting = table.awaySeats.isNotEmpty() || table.reconnecting
    LaunchedEffect(counting) { while (counting) { now = System.currentTimeMillis(); delay(1000) } }

    GameFrameChrome(
        title = stringResource(game.nameRes),
        rules = { onDismiss ->
            GameResultDialog(title = stringResource(R.string.action_rules), lines = snakesRulesLines.map { stringResource(it) }, primaryText = stringResource(R.string.spectate_ok), onPrimary = onDismiss)
        },
        onBackClick = onBackClick,
        undo = table.undo,
        inlineUndo = true
    ) {
        SnakesTable(
            state = state, isMyTurn = table.isMyTurn && !motion.busy, shownDice = motion.die.face ?: table.shownDice, pulse = pulse, onRoll = table::roll,
            motion = motion.frame, die = motion.die, mySeat = table.mySeat, away = table.awaySeats, botSeats = table.botSeats, now = now, talk = table.talk
        )
    }

    if (table.connectionLost) {
        ConnectionLostDialog(onBackClick)
    } else if (table.reconnecting) {
        ReconnectBand(stringResource(R.string.net_reconnecting_format, ((table.reconnectDeadline - now) / 1000).toInt().coerceAtLeast(0)), warning = true)
    } else if (table.rejoined) {
        LaunchedEffect(Unit) { delay(2_500); table.acknowledgeRejoined() }
        ReconnectBand(stringResource(R.string.net_back_again), warning = false)
    }
    if (!table.connectionLost && state.phase == SnakesPhase.OVER) {
        val seated = table.mySeat in state.players.indices
        LaunchedEffect(state) { if (seated) AppServices.snakesRecord.record(state, table.mySeat) }
        val record by AppServices.snakesRecord.value.collectAsState()
        SnakesResultsDialog(state = state, mySeat = table.mySeat, youName = youName, record = if (seated) record else null, offer = table.rematchOffer, onRematch = table::rematch, onBack = onBackClick)
    }
}
