package com.atmasanyam.app.ui.location

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.atmasanyam.app.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationFilterScreen(onDone: () -> Unit, viewModel: LocationFilterViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.saved) {
        onDone()
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.choose_location)) },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(horizontal = 16.dp)) {
            ListItem(
                headlineContent = { Text(stringResource(R.string.all_india)) },
                modifier = Modifier.clickable { viewModel.selectAllIndia() },
                trailingContent = { if (uiState.selectedState == null) Icon(Icons.Default.Check, contentDescription = null) },
            )
            HorizontalDivider()

            if (uiState.selectedState == null) {
                Text(stringResource(R.string.select_state), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(vertical = 8.dp))
                LazyColumn {
                    items(uiState.states) { state ->
                        ListItem(
                            headlineContent = { Text(state.name) },
                            modifier = Modifier.clickable { viewModel.selectState(state.name) },
                        )
                    }
                }
            } else {
                Text(uiState.selectedState.orEmpty(), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(vertical = 8.dp))
                if (uiState.isLoadingDistricts) {
                    CircularProgressIndicator()
                } else {
                    LazyColumn {
                        item {
                            ListItem(
                                headlineContent = { Text(stringResource(R.string.all_districts_in_state)) },
                                modifier = Modifier.clickable { viewModel.selectDistrict(null) },
                            )
                        }
                        items(uiState.districts) { district ->
                            ListItem(
                                headlineContent = { Text(district) },
                                modifier = Modifier.clickable { viewModel.selectDistrict(district) },
                            )
                        }
                    }
                }
            }
        }
    }
}
