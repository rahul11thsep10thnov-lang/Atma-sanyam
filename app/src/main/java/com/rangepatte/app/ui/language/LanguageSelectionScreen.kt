package com.rangepatte.app.ui.language

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.ClassicalButton
import com.rangepatte.app.ui.components.OrnamentalDivider
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.theme.BrassLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.Radii
import com.rangepatte.app.ui.theme.RoyalGold
import com.rangepatte.app.ui.theme.WoodBrown

/**
 * The very first screen a new player sees — picking a language is a precondition for everything
 * else, per the design brief ("first thing when the app opens, language option should be
 * selected"). Each option is always rendered in its own script ([AppLanguage.nativeName]) so it
 * reads correctly no matter what locale the app/device currently resolves to.
 */
@Composable
fun LanguageSelectionScreen(
    onLanguageChosen: (AppLanguage) -> Unit,
    modifier: Modifier = Modifier
) {
    var selected by remember { mutableStateOf<AppLanguage?>(null) }

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            OrnamentalDivider(modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
            Text(
                text = stringResource(R.string.language_select_title),
                style = MaterialTheme.typography.headlineLarge,
                color = RoyalGold,
                textAlign = TextAlign.Center
            )
            Text(
                text = stringResource(R.string.language_select_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 4.dp, bottom = 8.dp)
            )
            OrnamentalDivider(modifier = Modifier.padding(bottom = 12.dp))

            LazyColumn(
                modifier = Modifier.weight(1f, fill = false),
                contentPadding = PaddingValues(vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(AppLanguage.entries, key = { it.name }) { language ->
                    LanguageOptionRow(
                        language = language,
                        isSelected = selected == language,
                        onClick = { selected = language }
                    )
                }
            }

            ClassicalButton(
                text = stringResource(R.string.language_select_continue),
                onClick = { selected?.let(onLanguageChosen) },
                enabled = selected != null,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
            )
        }
    }
}

@Composable
private fun LanguageOptionRow(
    language: AppLanguage,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(WoodBrown.copy(alpha = 0.9f), RoundedCornerShape(Radii.Panel))
            .border(
                width = if (isSelected) 2.dp else 1.dp,
                color = if (isSelected) GoldenGlow else BrassLight,
                shape = RoundedCornerShape(Radii.Panel)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text(
            text = language.nativeName,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = if (isSelected) GoldenGlow else BrassLight
        )
        Text(
            text = language.englishName,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.75f)
        )
    }
}
