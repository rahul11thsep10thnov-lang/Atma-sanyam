package com.atmasanyam.app.ui.search

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.atmasanyam.app.R
import com.atmasanyam.app.ui.components.VideoCardItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(onOpenVideo: (String) -> Unit, onBack: () -> Unit, viewModel: SearchViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    OutlinedTextField(
                        value = uiState.query,
                        onValueChange = viewModel::onQueryChanged,
                        placeholder = { Text(stringResource(R.string.search_hint)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } },
                actions = { IconButton(onClick = viewModel::search) { Icon(Icons.Default.Search, contentDescription = "Search") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            if (uiState.isSearching) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
            LazyColumn(modifier = Modifier.padding(horizontal = 12.dp)) {
                items(uiState.results, key = { it.videoId }) { video ->
                    VideoCardItem(video = video, onClick = { onOpenVideo(video.videoId) })
                }
            }
        }
    }
}
