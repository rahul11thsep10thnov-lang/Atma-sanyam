package com.rangepatte.app.ui.board

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.R
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.ui.multiplayer.LobbyDecor
import com.rangepatte.app.ui.multiplayer.SeatColour

/**
 * What Ludo adds to the shared lobby page (stage 6, Design 1): each seat's colour for every table
 * size — the host plays red, the first guest sits opposite in yellow — and one line summing up the
 * house rules the host announced. Strings are resolved here so the lobby can rebuild the line as the
 * host's announcements arrive.
 */
@Composable
fun ludoLobbyDecor(): LobbyDecor {
    val names = LudoColor.entries.associateWith { stringResource(it.nameRes()) }
    val seats = (2..4).associateWith { n -> LudoEngine.colorsFor(n).map { SeatColour(LudoPalette.of(it), names.getValue(it)) } }
    val recommended = stringResource(R.string.ludo_lobby_rules_default)
    val none = stringResource(R.string.ludo_lobby_rules_none)
    val template = stringResource(R.string.ludo_lobby_rules_format)
    val labels = listOf(
        stringResource(R.string.ludo_rule_six_to_enter), stringResource(R.string.ludo_rule_extra_six),
        stringResource(R.string.ludo_rule_extra_capture), stringResource(R.string.ludo_rule_exact_finish),
        stringResource(R.string.ludo_rule_play_on)
    ).map { it.lowercase() }
    return LobbyDecor(seats) { options -> ludoRulesLine(LudoRules.decode(options), recommended, none, template, labels) }
}

/** "House rules: six to enter · extra roll on six · …", or the short forms for the recommended set and for none. */
fun ludoRulesLine(rules: LudoRules, recommended: String, none: String, template: String, labels: List<String>): String {
    if (rules.isDefault) return recommended
    val on = listOf(rules.sixToEnter, rules.extraRollOnSix, rules.extraRollOnCapture, rules.exactFinish, rules.playOnForPlaces)
        .mapIndexedNotNull { i, on -> labels[i].takeIf { on } }
    if (on.isEmpty()) return none
    return template.replace("%1\$s", on.joinToString(" · "))
}

fun LudoColor.nameRes(): Int = when (this) {
    LudoColor.RED -> R.string.ludo_color_red
    LudoColor.GREEN -> R.string.ludo_color_green
    LudoColor.YELLOW -> R.string.ludo_color_yellow
    LudoColor.BLUE -> R.string.ludo_color_blue
}
