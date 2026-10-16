package com.rangepatte.app.ui.board

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.domain.ludo.LudoAction
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoSetup
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.presence.Activity
import com.rangepatte.app.game.common.ConnectionLostDialog
import com.rangepatte.app.game.common.GameFrameChrome
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.ReconnectBand
import com.rangepatte.app.net.GameSession
import com.rangepatte.app.net.TableSessions

/**
 * The Ludo table (stage 3, Design 10): the approved board in the shared game frame, each player's
 * plaque in their yard, the die and the Roll button below. Alone it runs on [LudoSession]; when the
 * lobby (stage 6) handed over a table with other people it runs on [LudoOnlineTable], the same engine
 * over the lockstep session — the host's phone rolls and checks every move, and the animations only
 * show what the engine already decided.
 */
@Composable
fun LudoScreen(game: BoardGameInfo, setup: LudoSetup, onBackClick: () -> Unit) {
    val youName = stringResource(R.string.player_you)
    val youAvatar = AppServices.profile.profile.value?.avatarId
    val table: LudoTableController = remember {
        @Suppress("UNCHECKED_CAST")
        val offered = TableSessions.take()?.takeIf { it.machine.gameId == GameId.LUDO } as GameSession<LudoState, LudoAction>?
        if (offered != null) LudoOnlineTable(offered)
        else LudoSession(setup, youName, listOf("Ravi", "Meera", "Gopal"), youAvatar)
    }
    DisposableEffect(table) {
        table.start()
        // Friends see "playing Ludo" — and, for an online table, its code, so they can come and watch.
        val online = table as? LudoOnlineTable
        AppServices.presence.setActivity(Activity(GameId.LUDO, tableCode = online?.tableCode, seatsFree = 0))
        onDispose { table.close(); AppServices.presence.setActivity(null) }
    }
    val state = table.state
    val pulse by rememberInfiniteTransition(label = "ludoPulse").animateFloat(0f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulse")
    val context = androidx.compose.ui.platform.LocalContext.current
    val reduceMotion = remember { com.rangepatte.app.ui.motion.MotionPrefs.reduceMotion(context) }
    val motion = rememberLudoMotion(state, table.shownDice, reduceMotion, onBusy = { table.busy = it })
    // Stage 8: a one-second clock while a seat is kept or this phone is reconnecting, for the countdowns.
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    val counting = table.awaySeats.isNotEmpty() || table.reconnecting
    LaunchedEffect(counting) { while (counting) { now = System.currentTimeMillis(); delay(1000) } }

    GameFrameChrome(
        title = stringResource(game.nameRes),
        rules = { onDismiss ->
            GameResultDialog(
                title = stringResource(R.string.action_rules),
                lines = listOf(R.string.ludo_rules_1, R.string.ludo_rules_2, R.string.ludo_rules_3, R.string.ludo_rules_4, R.string.ludo_rules_5).map { stringResource(it) },
                primaryText = stringResource(R.string.spectate_ok), onPrimary = onDismiss
            )
        },
        onBackClick = onBackClick,
        undo = table.undo,
        inlineUndo = true
    ) {
        LudoTable(
            state = state, isMyTurn = table.isMyTurn && !motion.busy, shownDice = motion.die.face ?: table.shownDice, pulse = pulse,
            onRoll = table::roll, onMove = table::move, motion = motion.frame, die = motion.die, mySeat = table.mySeat,
            away = table.awaySeats, botSeats = table.botSeats, now = now, talk = table.talk
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
    if (!table.connectionLost && state.phase == LudoPhase.OVER) {
        // Stage 10: the finished match counts once towards this account's record (watchers have no seat to count).
        val seated = table.mySeat in state.players.indices
        LaunchedEffect(state) { if (seated) AppServices.ludoRecord.record(state, table.mySeat) }
        val record by AppServices.ludoRecord.value.collectAsState()
        LudoResultsDialog(
            state = state, mySeat = table.mySeat, youName = youName, record = if (seated) record else null,
            offer = table.rematchOffer, onRematch = table::rematch, onBack = onBackClick
        )
    }
}
