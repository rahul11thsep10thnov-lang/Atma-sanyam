package com.rangepatte.app.ui.snakes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.rangepatte.app.R
import com.rangepatte.app.domain.ludo.LudoRecord
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.ui.board.RematchOffer
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/** The end of a Moksha Patam match (stage 10): the statistics table — place, turns, sixes, ladders, serpents, square — the record, Rematch and Back. */
@Composable
fun SnakesResultsDialog(state: SnakesState, mySeat: Int, youName: String, record: LudoRecord?, offer: RematchOffer, onRematch: () -> Unit, onBack: () -> Unit) {
    val iWon = state.places.firstOrNull() == mySeat
    Dialog(onDismissRequest = {}) {
        RoyalPanel(title = if (iWon) stringResource(R.string.game_you_won) else stringResource(R.string.ludo_match_over), modifier = Modifier.fillMaxWidth()) {
            val ordinals = listOf(R.string.ludo_place_1, R.string.ludo_place_2, R.string.ludo_place_3, R.string.ludo_place_4).map { stringResource(it) }
            val headers = listOf(R.string.ludo_stats_place, R.string.ludo_stats_turns, R.string.ludo_stats_sixes, R.string.snakes_stats_ladders, R.string.snakes_stats_snakes, R.string.snakes_stats_square).map { stringResource(it) }
            StatsRow(name = "", cells = headers, header = true)
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(GoldBevelDark))
            state.places.forEachIndexed { i, seat ->
                val p = state.players[seat]; val s = state.statsOf(seat)
                StatsRow(name = if (seat == mySeat) youName else p.name, cells = listOf(ordinals.getOrElse(i) { "${i + 1}" }, "${s.turns}", "${s.sixes}", "${s.ladders}", "${s.snakes}", "${p.square}"), highlight = seat == mySeat)
            }
            if (record != null) {
                Text(stringResource(R.string.snakes_record_format, record.played, record.won, record.second, record.third), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
            }
            when (offer) {
                RematchOffer.WAITING -> Text(stringResource(R.string.ludo_waiting_rematch), style = MaterialTheme.typography.bodyMedium, color = GoldBevelLight, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                else -> RoyalButton(text = stringResource(if (offer == RematchOffer.REMATCH) R.string.ludo_rematch else R.string.ludo_play_again), onClick = onRematch, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
            }
            RoyalButton(text = stringResource(R.string.game_back_to_khel), onClick = onBack, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        }
    }
}

@Composable
private fun StatsRow(name: String, cells: List<String>, header: Boolean = false, highlight: Boolean = false) {
    val colour = when { header -> ParchmentTextDim; highlight -> GoldenGlow; else -> ParchmentText }
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(text = name, fontSize = 12.sp, lineHeight = 14.sp, fontWeight = if (highlight) FontWeight.Bold else FontWeight.Normal, color = colour, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1.6f))
        cells.forEach { c ->
            Text(text = c, fontSize = if (header) 10.sp else 12.sp, lineHeight = 14.sp, color = colour, textAlign = TextAlign.Center, fontWeight = if (header) FontWeight.SemiBold else FontWeight.Normal, maxLines = 1, modifier = Modifier.weight(1f))
        }
    }
}
