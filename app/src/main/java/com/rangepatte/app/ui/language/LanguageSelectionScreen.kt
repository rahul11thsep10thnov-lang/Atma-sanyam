package com.rangepatte.app.ui.language

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle

/**
 * The very first screen a new player sees — picking a language is a precondition for everything
 * else, per the design brief. Laid out like a "select profile" grid of framed tiles; each tile is
 * always rendered in its own script ([AppLanguage.nativeName]) so it reads correctly no matter what
 * locale the app/device currently resolves to. Continue applies the language instantly — no restart.
 */
@Composable
fun LanguageSelectionScreen(
    onLanguageChosen: (AppLanguage) -> Unit,
    modifier: Modifier = Modifier,
    initialSelection: AppLanguage? = null
) {
    var selected by remember { mutableStateOf(initialSelection) }

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val columns = if (maxWidth >= 600.dp) 4 else 2
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.Center
            ) {
                RoyalPanel(title = stringResource(R.string.language_select_title), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = stringResource(R.string.language_select_subtitle),
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParchmentTextDim,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 14.dp)
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        AppLanguage.entries.chunked(columns).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                row.forEach { language ->
                                    LanguageTile(
                                        language = language,
                                        isSelected = selected == language,
                                        onClick = { selected = language },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                                repeat(columns - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                            }
                        }
                    }
                    RoyalButton(
                        text = stringResource(R.string.language_select_continue),
                        onClick = { selected?.let(onLanguageChosen) },
                        enabled = selected != null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 18.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun LanguageTile(
    language: AppLanguage,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(3.dp)
    Column(
        modifier = modifier
            .aspectRatio(1.5f)
            .shadow(if (isSelected) 10.dp else 2.dp, shape)
            .background(Brush.verticalGradient(listOf(PanelWoodLight, PanelWoodDark)), shape)
            .border(if (isSelected) 2.dp else 1.dp, if (isSelected) GoldenGlow else GoldBevelDark, shape)
            .selectable(selected = isSelected, role = Role.RadioButton, onClick = onClick)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = language.nativeName,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = if (isSelected) GoldenGlow else ParchmentText,
            textAlign = TextAlign.Center
        )
        Text(
            text = language.englishName.uppercase(),
            style = RoyalLabelStyle,
            color = if (isSelected) GoldBevelLight else ParchmentTextDim,
            textAlign = TextAlign.Center
        )
    }
}
