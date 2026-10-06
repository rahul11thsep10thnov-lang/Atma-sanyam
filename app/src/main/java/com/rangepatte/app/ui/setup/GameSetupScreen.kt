package com.rangepatte.app.ui.setup

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.GamePortrait
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalSectionTitle
import com.rangepatte.app.ui.components.royal.RoyalSlot
import com.rangepatte.app.ui.rules.RulesDialog
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle
import com.rangepatte.app.ui.theme.RoyalTitleStyle

/**
 * Pre-game setup, laid out like a strategy game's unit-info card: an info panel for the game
 * (framed portrait, summary, player count, Rules) beside an options panel of square command slots
 * (how to play, player count) and difficulty plaques. Side by side on wide screens, stacked on
 * phones. The rules scroll pops up automatically the moment a game is selected (per the design
 * brief) and can be reopened from the header or the Rules button.
 */
@Composable
fun GameSetupScreen(
    game: GameInfo,
    onBackClick: () -> Unit,
    onStartGame: (playerCount: Int, difficulty: AiDifficulty, mode: PlayMode) -> Unit,
    onOpenLobby: (playerCount: Int, difficulty: AiDifficulty, mode: PlayMode, host: Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    var playerCount by remember(game.id) { mutableIntStateOf(game.minPlayers) }
    var difficulty by remember { mutableStateOf(AiDifficulty.MEDIUM) }
    var mode by remember(game.id) { mutableStateOf(PlayMode.VS_COMPUTER) }
    var showRules by remember(game.id) { mutableStateOf(false) }
    val isMultiplayerCapable = game.maxPlayers > 1
    val canPlayOnline = game.id in GameMachines.multiplayerGames
    val withOthers = mode == PlayMode.NEARBY || mode == PlayMode.ONLINE

    LaunchedEffect(game.id) { showRules = true }

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(
                title = stringResource(game.nameRes),
                onBackClick = onBackClick,
                onRulesClick = { showRules = true }
            )
            BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                val wide = maxWidth >= 600.dp
                val infoPanel = @Composable { panelModifier: Modifier ->
                    GameInfoPanel(game = game, onRulesClick = { showRules = true }, modifier = panelModifier)
                }
                val optionsPanel = @Composable { panelModifier: Modifier ->
                    RoyalPanel(title = stringResource(R.string.setup_title), modifier = panelModifier) {
                        if (isMultiplayerCapable) {
                            RoyalSectionTitle(stringResource(R.string.setup_mode_title))
                            ModeSlots(selected = mode, onSelect = { mode = it }, withOthersAvailable = canPlayOnline)
                            if (game.minPlayers < game.maxPlayers) RoyalSectionTitle(stringResource(R.string.setup_players))
                            if (game.minPlayers < game.maxPlayers) Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState())
                            ) {
                                (game.minPlayers..game.maxPlayers).forEach { count ->
                                    RoyalSlot(
                                        selected = playerCount == count,
                                        onClick = { playerCount = count },
                                        contentDescription = "$count ${stringResource(R.string.players_suffix)}",
                                        size = 48.dp
                                    ) {
                                        Text(
                                            text = count.toString(),
                                            style = RoyalTitleStyle,
                                            color = if (playerCount == count) GoldenGlow else ParchmentText
                                        )
                                    }
                                }
                            }
                        }
                        run {
                            RoyalSectionTitle(stringResource(R.string.setup_difficulty))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                AiDifficulty.entries.forEach { level ->
                                    RoyalButton(
                                        text = stringResource(level.labelRes()),
                                        onClick = { difficulty = level },
                                        style = if (difficulty == level) RoyalButtonStyle.CRIMSON else RoyalButtonStyle.STEEL,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                        difficultyHintRes(game.id)?.let { hint ->
                            Text(
                                text = stringResource(hint),
                                style = MaterialTheme.typography.bodyMedium,
                                color = ParchmentTextDim,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                            )
                        }
                        if (withOthers) {
                            Text(
                                text = stringResource(R.string.setup_others_hint),
                                style = MaterialTheme.typography.bodyMedium,
                                color = ParchmentTextDim,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                            )
                            RoyalButton(
                                text = stringResource(R.string.net_host_table),
                                onClick = { onOpenLobby(playerCount, difficulty, mode, true) },
                                modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                            )
                            RoyalButton(
                                text = stringResource(R.string.net_join_table),
                                onClick = { onOpenLobby(playerCount, difficulty, mode, false) },
                                style = RoyalButtonStyle.STEEL,
                                modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                            )
                        } else {
                            RoyalButton(
                                text = stringResource(R.string.setup_start),
                                onClick = { onStartGame(playerCount, difficulty, if (isMultiplayerCapable) mode else PlayMode.VS_COMPUTER) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 20.dp)
                            )
                        }
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (wide) {
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            infoPanel(Modifier.weight(1f))
                            optionsPanel(Modifier.weight(1.3f))
                        }
                    } else {
                        infoPanel(Modifier.fillMaxWidth())
                        optionsPanel(Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }

    if (showRules) {
        RulesDialog(game = game, onDismiss = { showRules = false })
    }
}

@Composable
private fun GameInfoPanel(game: GameInfo, onRulesClick: () -> Unit, modifier: Modifier = Modifier) {
    RoyalPanel(title = stringResource(game.nameRes), modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            GamePortrait(game = game, size = 96.dp)
            Column(modifier = Modifier
                .weight(1f)
                .padding(start = 14.dp)) {
                Text(
                    text = stringResource(game.descriptionRes),
                    style = MaterialTheme.typography.bodyLarge,
                    color = ParchmentText
                )
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                    Icon(
                        imageVector = Icons.Filled.Groups,
                        contentDescription = null,
                        tint = GoldBevelLight,
                        modifier = Modifier.size(18.dp)
                    )
                    val players = if (game.minPlayers == game.maxPlayers) "${game.minPlayers}" else "${game.minPlayers}–${game.maxPlayers}"
                    Text(
                        text = "$players ${stringResource(R.string.players_suffix)}",
                        style = RoyalLabelStyle,
                        color = GoldBevelLight,
                        modifier = Modifier.padding(start = 6.dp)
                    )
                }
            }
        }
        RoyalButton(
            text = stringResource(R.string.action_rules),
            onClick = onRulesClick,
            style = RoyalButtonStyle.STEEL,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 14.dp)
        )
    }
}

private data class ModeOption(val mode: PlayMode, val icon: ImageVector, val labelRes: Int, val available: Boolean)

private fun modeOptions(withOthersAvailable: Boolean) = listOf(
    ModeOption(PlayMode.VS_COMPUTER, Icons.Filled.Computer, R.string.setup_mode_vs_computer, available = true),
    ModeOption(PlayMode.PASS_AND_PLAY, Icons.Filled.Groups, R.string.setup_mode_pass_play, available = false),
    ModeOption(PlayMode.NEARBY, Icons.Filled.Wifi, R.string.setup_mode_nearby, available = withOthersAvailable),
    ModeOption(PlayMode.ONLINE, Icons.Filled.Public, R.string.setup_mode_online, available = withOthersAvailable)
)

/** Four square command slots for how to play; Pass & Play is shown locked ("coming soon"). */
@Composable
private fun ModeSlots(selected: PlayMode, onSelect: (PlayMode) -> Unit, withOthersAvailable: Boolean) {
    val comingSoon = stringResource(R.string.setup_mode_coming_soon)
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
    ) {
        modeOptions(withOthersAvailable).forEach { option ->
            val label = stringResource(option.labelRes)
            val isSelected = selected == option.mode
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(72.dp)) {
                RoyalSlot(
                    selected = isSelected,
                    onClick = { onSelect(option.mode) },
                    contentDescription = if (option.available) label else "$label, $comingSoon",
                    enabled = option.available
                ) {
                    Icon(
                        imageVector = if (option.available) option.icon else Icons.Filled.Lock,
                        contentDescription = null,
                        tint = if (isSelected) GoldenGlow else ParchmentText,
                        modifier = Modifier.size(26.dp)
                    )
                }
                Text(
                    text = label,
                    style = RoyalLabelStyle.copy(fontSize = 12.sp, letterSpacing = 0.4.sp, lineHeight = 15.sp),
                    color = if (isSelected) GoldBevelLight else ParchmentTextDim,
                    textAlign = TextAlign.Center,
                    maxLines = 3,
                    modifier = Modifier.padding(top = 4.dp)
                )
                if (!option.available) {
                    Text(
                        text = comingSoon,
                        style = RoyalLabelStyle.copy(fontSize = 11.sp, letterSpacing = 0.sp),
                        color = GoldBevelDark,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

/** What "difficulty" means in games where it isn't just how clever the computer is. */
private fun difficultyHintRes(id: GameId): Int? = when (id) {
    GameId.SOLITAIRE -> R.string.setup_hint_solitaire
    GameId.SPIDER_SOLITAIRE -> R.string.setup_hint_spider
    else -> null
}

private fun AiDifficulty.labelRes(): Int = when (this) {
    AiDifficulty.EASY -> R.string.difficulty_easy
    AiDifficulty.MEDIUM -> R.string.difficulty_medium
    AiDifficulty.HARD -> R.string.difficulty_hard
}
