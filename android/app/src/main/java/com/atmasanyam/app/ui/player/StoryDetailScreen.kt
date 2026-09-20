package com.atmasanyam.app.ui.player

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.atmasanyam.app.R

/** "Story details" reachable from the player (spec §19) — full facts + source attribution. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoryDetailScreen(onBack: () -> Unit, viewModel: StoryDetailViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text(stringResource(R.string.story_details)) }) }) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            when {
                uiState.isLoading -> CircularProgressIndicator()
                uiState.story == null -> Text(stringResource(R.string.video_unavailable))
                else -> {
                    val story = uiState.story!!
                    Text(story.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(story.summary, style = MaterialTheme.typography.bodyLarge)
                    Spacer(Modifier.height(16.dp))
                    story.legalStatus?.let { Text("${stringResource(R.string.legal_status)}: $it") }
                    story.currentStatus?.let { Text("${stringResource(R.string.current_status)}: $it") }
                    Spacer(Modifier.height(16.dp))
                    Text(stringResource(R.string.sources), style = MaterialTheme.typography.titleMedium)
                    story.sourceNames.forEach { Text("• $it") }
                    Spacer(Modifier.height(16.dp))
                    Text(story.disclaimer, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}
