package com.rangepatte.app.ui.rules

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.domain.rules.RulesContent
import com.rangepatte.app.ui.language.LocalAppLanguage
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.OrnamentalDivider
import com.rangepatte.app.ui.theme.AntiqueGold
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodLight
import com.rangepatte.app.ui.theme.ParchmentCream
import com.rangepatte.app.ui.theme.Radii
import com.rangepatte.app.ui.theme.RoyalGold
import com.rangepatte.app.ui.theme.TextPrimaryLight

/**
 * "How to play" presented as a royal scroll invitation — a parchment card with a gold rule
 * border, opened as a popup the moment a game is selected rather than a separate navigated page.
 * The rules are shown in the player's chosen language, with a toggle to read them in English.
 * Content comes from [RulesContent]; a game with no structured rules yet falls back to
 * [R.string.rules_placeholder].
 */
@Composable
fun RulesDialog(
    game: GameInfo,
    onDismiss: () -> Unit
) {
    val appLanguage = LocalAppLanguage.current
    var shownLanguage by remember(appLanguage) { mutableStateOf(appLanguage) }
    val book = RulesContent.book(shownLanguage)
    val rules = RulesContent.forGame(game.id, shownLanguage)

    Dialog(onDismissRequest = onDismiss) {
        Column {
            ScrollRod()
            Column(
                modifier = Modifier
                    .padding(horizontal = 10.dp)
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

                if (appLanguage != AppLanguage.ENGLISH) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(bottom = 12.dp)
                    ) {
                        LanguageTab(appLanguage.nativeName, shownLanguage == appLanguage) { shownLanguage = appLanguage }
                        LanguageTab(AppLanguage.ENGLISH.nativeName, shownLanguage == AppLanguage.ENGLISH) { shownLanguage = AppLanguage.ENGLISH }
                    }
                }

                if (rules != null) {
                    Column(
                        modifier = Modifier
                            .heightIn(max = 420.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            text = book.objectiveHeading,
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
                        RuleSection(book.setupHeading, rules.setup)
                        RuleSection(book.playHeading, rules.play)
                        RuleSection(book.scoringHeading, rules.scoring)
                    }
                } else {
                    Text(
                        text = stringResource(R.string.rules_placeholder),
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextPrimaryLight
                    )
                }

                RoyalButton(
                    text = stringResource(R.string.rules_dialog_close),
                    onClick = onDismiss,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                )
            }
            ScrollRod()
        }
    }
}

/** A turned-wood roller with gold end knobs — the top and bottom of the unrolled scroll. */
@Composable
private fun ScrollRod() {
    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(16.dp)
    ) {
        val knob = size.height / 2f
        drawRoundRect(
            brush = Brush.verticalGradient(listOf(PanelWoodLight, PanelWoodDark, PanelWoodLight)),
            topLeft = Offset(knob, size.height * 0.15f),
            size = Size(size.width - knob * 2, size.height * 0.7f),
            cornerRadius = CornerRadius(size.height * 0.35f)
        )
        drawCircle(color = GoldBevelLight, radius = knob, center = Offset(knob, size.height / 2f))
        drawCircle(color = GoldBevelLight, radius = knob, center = Offset(size.width - knob, size.height / 2f))
        drawCircle(color = GoldBevelDark, radius = knob, center = Offset(knob, size.height / 2f), style = Stroke(width = 1.dp.toPx()))
        drawCircle(color = GoldBevelDark, radius = knob, center = Offset(size.width - knob, size.height / 2f), style = Stroke(width = 1.dp.toPx()))
    }
}

/** One of the two language tabs at the top of the scroll; the selected one is a filled gold plaque. */
@Composable
private fun LanguageTab(label: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(3.dp)
    Text(
        text = label,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = if (selected) TextPrimaryLight else AntiqueGold,
        modifier = Modifier
            .background(if (selected) RoyalGold else Color.Transparent, shape)
            .border(1.dp, AntiqueGold, shape)
            .selectable(selected = selected, role = Role.Tab, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp)
    )
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
