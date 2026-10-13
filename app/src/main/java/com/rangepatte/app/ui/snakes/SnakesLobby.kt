package com.rangepatte.app.ui.snakes

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.R
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.domain.snakes.SnakesRules
import com.rangepatte.app.ui.board.LudoPalette
import com.rangepatte.app.ui.board.nameRes
import com.rangepatte.app.ui.multiplayer.LobbyDecor
import com.rangepatte.app.ui.multiplayer.SeatColour

/** What Moksha Patam adds to the shared lobby page (stage 6): the token colours per seat and the house-rules line. */
@Composable
fun snakesLobbyDecor(): LobbyDecor {
    val names = LudoColor.entries.associateWith { stringResource(it.nameRes()) }
    val seatsFor = { n: Int, _: String -> LudoEngine.colorsFor(n.coerceIn(2, 4)).map { SeatColour(LudoPalette.of(it), names.getValue(it)) } }
    val recommended = stringResource(R.string.ludo_lobby_rules_default)
    val none = stringResource(R.string.ludo_lobby_rules_none)
    val template = stringResource(R.string.ludo_lobby_rules_format)
    val labels = listOf(
        stringResource(R.string.snakes_rule_six_to_start), stringResource(R.string.snakes_rule_six_again), stringResource(R.string.snakes_rule_exact_finish),
        stringResource(R.string.snakes_rule_bounce), stringResource(R.string.snakes_rule_captures), stringResource(R.string.snakes_rule_play_on)
    ).map { it.lowercase() }
    return LobbyDecor(seatsFor) { options ->
        val r = SnakesRules.decode(options)
        if (r.isDefault) recommended else {
            val on = listOf(r.sixToStart, r.sixRollsAgain, r.exactFinish, r.bounceBack, r.captures, r.playOnForPlaces).mapIndexedNotNull { i, b -> labels[i].takeIf { b } }
            if (on.isEmpty()) none else template.replace("%1\$s", on.joinToString(" · "))
        }
    }
}
