package com.atmasanyam.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
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
fun SettingsScreen(onBack: () -> Unit, viewModel: SettingsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings)) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } },
            )
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).padding(horizontal = 16.dp)) {
            item {
                Text(stringResource(R.string.language), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
            }
            items(uiState.languages) { language ->
                ListItem(
                    headlineContent = { Text("${language.nativeName} (${language.englishName})") },
                    trailingContent = {
                        RadioButton(
                            selected = uiState.currentLanguageCode == language.code,
                            onClick = { viewModel.selectLanguage(language.code) },
                        )
                    },
                )
            }

            item {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                Text(stringResource(R.string.interests), style = MaterialTheme.typography.titleMedium)
                Text(stringResource(R.string.interests_subtitle), style = MaterialTheme.typography.bodyMedium)
            }
            items(uiState.categories) { category ->
                ListItem(
                    headlineContent = { Text(category.label) },
                    trailingContent = {
                        Checkbox(
                            checked = uiState.selectedCategories.contains(category.key),
                            onCheckedChange = { viewModel.toggleCategory(category.key) },
                        )
                    },
                )
            }

            item {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                ListItem(
                    headlineContent = { Text(stringResource(R.string.notifications)) },
                    trailingContent = {
                        Switch(checked = uiState.notificationsEnabled, onCheckedChange = viewModel::setNotificationsEnabled)
                    },
                )
            }
        }
    }
}
