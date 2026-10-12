package com.rangepatte.app.ui.snakes

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.domain.snakes.SnakesRules
import com.rangepatte.app.domain.snakes.SnakesSetup
import com.rangepatte.app.ui.board.BoardSetupScreen
import com.rangepatte.app.ui.board.RuleRow
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.thumbnails.SnakesThumbnail

/** Moksha Patam's introduction and mode selection (stage 2): the shared board setup page with its own words and switches. */
@Composable
fun SnakesSetupScreen(
    game: BoardGameInfo,
    onBackClick: () -> Unit,
    onStart: (SnakesSetup, PlayMode) -> Unit,
    onOpenLobby: (SnakesSetup, PlayMode, host: Boolean) -> Unit,
    modifier: Modifier = Modifier,
    initial: SnakesSetup = SnakesSetup()
) {
    var rules by remember { mutableStateOf(initial.rules) }
    BoardSetupScreen(
        game = game,
        portrait = { SnakesThumbnail() },
        introRes = R.string.snakes_intro,
        rulesLines = snakesRulesLines,
        playersHint = { stringResource(R.string.snakes_players_hint) },
        initialPlayers = initial.players,
        initialDifficulty = initial.difficulty,
        houseRules = { SnakesHouseRules(rules, onChange = { rules = it }) },
        onBackClick = onBackClick,
        onStart = { players, difficulty, mode -> onStart(SnakesSetup(players, rules, difficulty), mode) },
        onOpenLobby = { players, difficulty, mode, host -> onOpenLobby(SnakesSetup(players, rules, difficulty), mode, host) },
        modifier = modifier
    )
}

val snakesRulesLines = listOf(R.string.snakes_rules_1, R.string.snakes_rules_2, R.string.snakes_rules_3, R.string.snakes_rules_4, R.string.snakes_rules_5)

/** The House rules plaque: six orb switches preset to the recommended ruleset. */
@Composable
fun SnakesHouseRules(rules: SnakesRules, onChange: (SnakesRules) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        RuleRow(stringResource(R.string.snakes_rule_six_to_start), stringResource(R.string.snakes_rule_six_to_start_hint), rules.sixToStart) { onChange(rules.copy(sixToStart = it)) }
        RuleRow(stringResource(R.string.snakes_rule_six_again), stringResource(R.string.snakes_rule_six_again_hint), rules.sixRollsAgain) { onChange(rules.copy(sixRollsAgain = it)) }
        RuleRow(stringResource(R.string.snakes_rule_exact_finish), stringResource(R.string.snakes_rule_exact_finish_hint), rules.exactFinish) { onChange(rules.copy(exactFinish = it)) }
        RuleRow(stringResource(R.string.snakes_rule_bounce), stringResource(R.string.snakes_rule_bounce_hint), rules.bounceBack) { onChange(rules.copy(bounceBack = it)) }
        RuleRow(stringResource(R.string.snakes_rule_captures), stringResource(R.string.snakes_rule_captures_hint), rules.captures) { onChange(rules.copy(captures = it)) }
        RuleRow(stringResource(R.string.snakes_rule_play_on), stringResource(R.string.snakes_rule_play_on_hint), rules.playOnForPlaces) { onChange(rules.copy(playOnForPlaces = it)) }
        Text(stringResource(R.string.snakes_rules_note), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, modifier = Modifier.padding(top = 6.dp))
    }
}
