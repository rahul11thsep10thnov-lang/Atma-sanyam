package com.atmasanyam.app.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.atmasanyam.app.R
import com.atmasanyam.app.domain.model.Category
import com.atmasanyam.app.ui.components.VideoCardItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenVideo: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenLocationFilter: () -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    val lifecycleOwner = LocalLifecycleOwner.current
    val currentViewModel by rememberUpdatedState(viewModel)
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) currentViewModel.refreshLocationFromPreferences()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.family_news), fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onOpenLocationFilter) { Icon(Icons.Default.LocationOn, contentDescription = "Location") }
                    IconButton(onClick = onOpenSearch) { Icon(Icons.Default.Search, contentDescription = "Search") }
                    IconButton(onClick = onOpenSettings) { Icon(Icons.Default.Settings, contentDescription = "Settings") }
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            CategoryChipRow(
                categories = uiState.categories,
                selected = uiState.selectedCategory,
                onSelect = viewModel::selectCategory,
            )

            when {
                uiState.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                uiState.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Couldn't load feed: ${uiState.error}")
                }
                uiState.videos.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.no_stories_found))
                }
                else -> LazyColumn(modifier = Modifier.padding(horizontal = 12.dp)) {
                    items(uiState.videos, key = { it.videoId }) { video ->
                        VideoCardItem(video = video, onClick = { onOpenVideo(video.videoId) })
                    }
                    item {
                        if (uiState.nextCursor != null) {
                            LaunchedLoadMore(onLoadMore = viewModel::loadMore)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LaunchedLoadMore(onLoadMore: () -> Unit) {
    LaunchedEffect(Unit) { onLoadMore() }
    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun CategoryChipRow(
    categories: List<Category>,
    selected: String?,
    onSelect: (String?) -> Unit,
) {
    LazyRow(
        modifier = Modifier.padding(vertical = 8.dp, horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            FilterChip(selected = selected == null, onClick = { onSelect(null) }, label = { Text(stringResource(R.string.category_all)) })
        }
        items(categories) { category ->
            FilterChip(
                selected = selected == category.key,
                onClick = { onSelect(category.key) },
                label = { Text(category.label) },
            )
        }
    }
}
