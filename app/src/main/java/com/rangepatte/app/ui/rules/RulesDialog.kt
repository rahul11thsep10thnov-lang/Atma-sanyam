package com.rangepatte.app.ui.rules

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.RulesContent
import com.rangepatte.app.ui.components.ClassicalButton
import com.rangepatte.app.ui.components.OrnamentalDivider
import com.rangepatte.app.ui.theme.AntiqueGold
import com.rangepatte.app.ui.theme.ParchmentCream
import com.rangepatte.app.ui.theme.Radii
import com.rangepatte.app.ui.theme.RoyalGold
import com.rangepatte.app.ui.theme.TextPrimaryLight

/**
 * "How to play" presented as a royal scroll invitation — a parchment card with a gold rule
 * border, opened as a popup the moment a game is selected (per the design brief) rather than a
 * separate navigated page. Content comes from [RulesContent]; a game with no structured rules yet
 * falls back to [R.string.rules_placeholder].
 */
@Composable
fun RulesDialog(
    game: GameInfo,
    onDismiss: () -> Unit
) {
    val rules = RulesContent.forGame(game.id)

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .background(ParchmentCream, RoundedCornerShape(Radii.Panel))
                .border(2.dp, RoyalGold, RoundedCornerShape(Radii.Panel))
                .padding(20.dp)
        ) {
            OrnamentalDivider(modifier = Modifier.padding(bottom = 4.dp))
            Text(
                text = stringResource(R.string.rules_title_format, stringResource(game.nameRes)),
                style = MaterialTheme.typography.headlineMedium,
                color = AntiqueGold
            )
            OrnamentalDivider(modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))

            if (rules != null) {
                Column(
                    modifier = Modifier
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        text = stringResource(R.string.rules_objective_heading),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = AntiqueGold
                    )
                    Text(
                        text = rules.objective,
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextPrimaryLight,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                    RuleSection(stringResource(R.string.rules_setup_heading), rules.setup)
                    RuleSection(stringResource(R.string.rules_play_heading), rules.play)
                    RuleSection(stringResource(R.string.rules_scoring_heading), rules.scoring)
                }
            } else {
                Text(
                    text = stringResource(R.string.rules_placeholder),
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextPrimaryLight
                )
            }

            ClassicalButton(
                text = stringResource(R.string.rules_dialog_close),
                onClick = onDismiss,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
            )
        }
    }
}

@Composable
private fun RuleSection(heading: String, bullets: List<String>) {
    Column(modifier = Modifier.padding(top = 14.dp)) {
        Text(
            text = heading,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = AntiqueGold
        )
        Column(
            modifier = Modifier.padding(top = 4.dp),
        ) {
            bullets.forEach { bullet ->
                Row(modifier = Modifier.padding(vertical = 3.dp)) {
                    Text(
                        text = "•",
                        style = MaterialTheme.typography.bodyMedium,
                        color = AntiqueGold,
                        modifier = Modifier.padding(end = 8.dp)
                    )
                    Text(
                        text = bullet,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextPrimaryLight,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}
