package com.atmasanyam.app.ui.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.atmasanyam.app.R
import com.atmasanyam.app.domain.model.Language

/** First-launch language picker (spec §7) — the very first screen the user sees. */
@Composable
fun LanguageSelectionScreen(
    onLanguageSelected: () -> Unit,
    viewModel: LanguageSelectionViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.completed) {
        onLanguageSelected()
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(48.dp))
        Text(stringResource(R.string.choose_your_language), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(24.dp))

        when {
            uiState.isLoading -> CircularProgressIndicator()
            uiState.error != null -> Text("Could not load languages: ${uiState.error}")
            else -> LazyColumn(modifier = Modifier.weight(1f, fill = false)) {
                items(uiState.languages) { language ->
                    LanguageRow(language = language, enabled = !uiState.isSaving, onClick = { viewModel.selectLanguage(language) })
                }
            }
        }

        if (uiState.isSaving) {
            Spacer(Modifier.height(16.dp))
            CircularProgressIndicator()
        }
    }
}

@Composable
private fun LanguageRow(language: Language, enabled: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        onClick = onClick,
        enabled = enabled,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(language.nativeName, style = MaterialTheme.typography.titleMedium)
            Text(language.englishName, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
