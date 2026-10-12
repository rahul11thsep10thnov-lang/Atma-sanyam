package com.rangepatte.app.ui.board

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.domain.ludo.LudoSetup
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalOptionRow
import com.rangepatte.app.ui.components.royal.RoyalOrbToggle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalSectionTitle
import com.rangepatte.app.ui.components.royal.RoyalSlot
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle
import com.rangepatte.app.ui.theme.RoyalTitleStyle
import com.rangepatte.app.ui.thumbnails.LudoThumbnail

/**
 * The board games' introduction and mode selection page (Ludo stage 2, approved Design 1; Moksha
 * Patam uses the same page): the card games' setup page — portrait and two-line introduction, the
 * mode slots, Players, AI difficulty — plus a House rules plaque whose orb switches are preset to
 * the recommended ruleset, then Start (or Host / Join). The rules state belongs to the caller.
 */
@Composable
fun BoardSetupScreen(
    game: BoardGameInfo,
    portrait: @Composable () -> Unit,
    introRes: Int,
    rulesLines: List<Int>,
    playersHint: @Composable (players: Int) -> String,
    initialPlayers: Int,
    initialDifficulty: AiDifficulty,
    houseRules: @Composable () -> Unit,
    onBackClick: () -> Unit,
    onStart: (players: Int, difficulty: AiDifficulty, mode: PlayMode) -> Unit,
    onOpenLobby: (players: Int, difficulty: AiDifficulty, mode: PlayMode, host: Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    var players by remember { mutableIntStateOf(initialPlayers) }
    var difficulty by remember { mutableStateOf(initialDifficulty) }
    var mode by remember { mutableStateOf(PlayMode.VS_COMPUTER) }
    var showRules by remember { mutableStateOf(false) }
    val withOthers = mode == PlayMode.NEARBY || mode == PlayMode.ONLINE

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(game.nameRes), onBackClick = onBackClick, onRulesClick = { showRules = true })
            BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                val wide = maxWidth >= 600.dp
                val infoPanel = @Composable { m: Modifier -> BoardInfoPanel(game, portrait, introRes, onRulesClick = { showRules = true }, modifier = m) }
                val optionsPanel = @Composable { m: Modifier ->
                    RoyalPanel(title = stringResource(R.string.setup_title), modifier = m) {
                        RoyalSectionTitle(stringResource(R.string.setup_mode_title))
                        ModeSlots(selected = mode, onSelect = { mode = it })
                        RoyalSectionTitle(stringResource(R.string.setup_players))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            (game.minPlayers..game.maxPlayers).forEach { count ->
                                RoyalSlot(selected = players == count, onClick = { players = count }, contentDescription = "$count ${stringResource(R.string.players_suffix)}", size = 48.dp) {
                                    Text(count.toString(), style = RoyalTitleStyle, color = if (players == count) GoldenGlow else ParchmentText)
                                }
                            }
                        }
                        Text(text = playersHint(players), style = MaterialTheme.typography.bodyMedium, color = ParchmentTextDim, modifier = Modifier.padding(top = 6.dp))
                        RoyalSectionTitle(stringResource(R.string.setup_difficulty))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            AiDifficulty.entries.forEach { level ->
                                RoyalButton(
                                    text = stringResource(when (level) { AiDifficulty.EASY -> R.string.difficulty_easy; AiDifficulty.MEDIUM -> R.string.difficulty_medium; AiDifficulty.HARD -> R.string.difficulty_hard }),
                                    onClick = { difficulty = level },
                                    style = if (difficulty == level) RoyalButtonStyle.CRIMSON else RoyalButtonStyle.STEEL,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                        RoyalSectionTitle(stringResource(R.string.ludo_house_rules))
                        houseRules()
                        if (withOthers) {
                            Text(stringResource(R.string.setup_others_hint), style = MaterialTheme.typography.bodyMedium, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                            RoyalButton(text = stringResource(R.string.net_host_table), onClick = { onOpenLobby(players, difficulty, mode, true) }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp))
                            RoyalButton(text = stringResource(R.string.net_join_table), onClick = { onOpenLobby(players, difficulty, mode, false) }, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
                        } else {
                            RoyalButton(text = stringResource(R.string.setup_start), onClick = { onStart(players, difficulty, mode) }, modifier = Modifier.fillMaxWidth().padding(top = 20.dp))
                        }
                    }
                }
                Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    if (wide) Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) { infoPanel(Modifier.weight(1f)); optionsPanel(Modifier.weight(1.3f)) }
                    else { infoPanel(Modifier.fillMaxWidth()); optionsPanel(Modifier.fillMaxWidth()) }
                }
            }
        }
    }
    if (showRules) {
        GameResultDialog(
            title = stringResource(R.string.action_rules),
            lines = rulesLines.map { stringResource(it) },
            primaryText = stringResource(R.string.spectate_ok),
            onPrimary = { showRules = false }
        )
    }
}

/** Ludo's page: the generic board setup page with Ludo's portrait, words and House rules. */
@Composable
fun LudoSetupScreen(
    game: BoardGameInfo,
    onBackClick: () -> Unit,
    onStart: (LudoSetup, PlayMode) -> Unit,
    onOpenLobby: (LudoSetup, PlayMode, host: Boolean) -> Unit,
    modifier: Modifier = Modifier,
    initial: LudoSetup = LudoSetup()
) {
    var rules by remember { mutableStateOf(initial.rules) }
    BoardSetupScreen(
        game = game,
        portrait = { LudoThumbnail() },
        introRes = R.string.ludo_intro,
        rulesLines = listOf(R.string.ludo_rules_1, R.string.ludo_rules_2, R.string.ludo_rules_3, R.string.ludo_rules_4, R.string.ludo_rules_5),
        playersHint = { n -> stringResource(if (n == 2) R.string.ludo_players_two_hint else if (n == 3) R.string.ludo_players_three_hint else R.string.ludo_players_four_hint) },
        initialPlayers = initial.players,
        initialDifficulty = initial.difficulty,
        houseRules = { HouseRules(rules, onChange = { rules = it }) },
        onBackClick = onBackClick,
        onStart = { players, difficulty, mode -> onStart(LudoSetup(players, rules, difficulty), mode) },
        onOpenLobby = { players, difficulty, mode, host -> onOpenLobby(LudoSetup(players, rules, difficulty), mode, host) },
        modifier = modifier
    )
}

/** The House rules plaque: five orb switches preset to the recommended ruleset, each with a one-line caption. */
@Composable
fun HouseRules(rules: LudoRules, onChange: (LudoRules) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        RuleRow(stringResource(R.string.ludo_rule_six_to_enter), stringResource(R.string.ludo_rule_six_to_enter_hint), rules.sixToEnter) { onChange(rules.copy(sixToEnter = it)) }
        RuleRow(stringResource(R.string.ludo_rule_extra_six), stringResource(R.string.ludo_rule_extra_six_hint), rules.extraRollOnSix) { onChange(rules.copy(extraRollOnSix = it)) }
        RuleRow(stringResource(R.string.ludo_rule_extra_capture), stringResource(R.string.ludo_rule_extra_capture_hint), rules.extraRollOnCapture) { onChange(rules.copy(extraRollOnCapture = it)) }
        RuleRow(stringResource(R.string.ludo_rule_exact_finish), stringResource(R.string.ludo_rule_exact_finish_hint), rules.exactFinish) { onChange(rules.copy(exactFinish = it)) }
        RuleRow(stringResource(R.string.ludo_rule_play_on), stringResource(R.string.ludo_rule_play_on_hint), rules.playOnForPlaces) { onChange(rules.copy(playOnForPlaces = it)) }
        Text(stringResource(R.string.ludo_rules_safe_note), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, modifier = Modifier.padding(top = 6.dp))
    }
}

@Composable
fun RuleRow(label: String, hint: String, on: Boolean, onChange: (Boolean) -> Unit) {
    RoyalOptionRow(label = label) { RoyalOrbToggle(checked = on, onCheckedChange = onChange) }
    Text(hint, style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp))
}

@Composable
private fun BoardInfoPanel(game: BoardGameInfo, portrait: @Composable () -> Unit, introRes: Int, onRulesClick: () -> Unit, modifier: Modifier = Modifier) {
    RoyalPanel(title = stringResource(game.nameRes), modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            val shape = RoundedCornerShape(3.dp)
            Box(
                modifier = Modifier.size(96.dp)
                    .background(Brush.radialGradient(listOf(Color(0xFFB8741E), Color(0xFF3E2408))), shape)
                    .border(2.dp, GoldBevelDark, shape).padding(3.dp).border(1.dp, GoldBevelLight.copy(alpha = 0.6f), shape).padding(4.dp)
            ) { portrait() }
            Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                Text(stringResource(introRes), style = MaterialTheme.typography.bodyLarge, color = ParchmentText)
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                    Icon(Icons.Filled.Groups, contentDescription = null, tint = GoldBevelLight, modifier = Modifier.size(18.dp))
                    Text("${game.minPlayers}–${game.maxPlayers} ${stringResource(R.string.players_suffix)}", style = RoyalLabelStyle, color = GoldBevelLight, modifier = Modifier.padding(start = 6.dp))
                }
            }
        }
        RoyalButton(text = stringResource(R.string.action_rules), onClick = onRulesClick, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 14.dp))
    }
}

private data class ModeOption(val mode: PlayMode, val icon: ImageVector, val labelRes: Int, val available: Boolean)

@Composable
private fun ModeSlots(selected: PlayMode, onSelect: (PlayMode) -> Unit) {
    val comingSoon = stringResource(R.string.setup_mode_coming_soon)
    val options = listOf(
        ModeOption(PlayMode.VS_COMPUTER, Icons.Filled.Computer, R.string.setup_mode_vs_computer, true),
        ModeOption(PlayMode.PASS_AND_PLAY, Icons.Filled.Groups, R.string.setup_mode_pass_play, false),
        ModeOption(PlayMode.NEARBY, Icons.Filled.Wifi, R.string.setup_mode_nearby, true),
        ModeOption(PlayMode.ONLINE, Icons.Filled.Public, R.string.setup_mode_online, true)
    )
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
        options.forEach { option ->
            val label = stringResource(option.labelRes)
            val isSelected = selected == option.mode
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(72.dp)) {
                RoyalSlot(selected = isSelected, onClick = { onSelect(option.mode) }, contentDescription = if (option.available) label else "$label, $comingSoon", enabled = option.available) {
                    Icon(if (option.available) option.icon else Icons.Filled.Lock, contentDescription = null, tint = if (isSelected) GoldenGlow else ParchmentText, modifier = Modifier.size(26.dp))
                }
                Text(label, style = RoyalLabelStyle.copy(fontSize = 12.sp, letterSpacing = 0.4.sp, lineHeight = 15.sp), color = if (isSelected) GoldBevelLight else ParchmentTextDim, textAlign = TextAlign.Center, maxLines = 3, modifier = Modifier.padding(top = 4.dp))
                if (!option.available) Text(comingSoon, style = RoyalLabelStyle.copy(fontSize = 11.sp, letterSpacing = 0.sp), color = GoldBevelDark, textAlign = TextAlign.Center)
            }
        }
    }
}
