package com.wholesoul.app.presentation.admin

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar

@Composable
fun AdminCategoryEditScreen(
    onBack: () -> Unit,
    viewModel: AdminCategoryEditViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(state.finished) { if (state.finished) onBack() }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) viewModel.setPhoto(uri.toString())
    }

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = if (state.isNew) "Add category" else "Edit category", onBack = onBack)
        when {
            state.isLoading -> Box(Modifier.fillMaxSize())
            state.notFound -> EmptyStateView(title = "Category not found", message = "It may have been deleted.")
            else -> Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val form = state.form
                Text("Photo", style = MaterialTheme.typography.titleSmall)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (form.photo.isNotEmpty()) {
                        AdminThumbnail(imageKey = form.photo, description = "Category photo", size = 96.dp)
                        Spacer(Modifier.width(12.dp))
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        OutlinedButton(
                            onClick = { photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                            enabled = !state.isImportingPhoto,
                        ) { Text(if (state.isImportingPhoto) "Adding…" else if (form.photo.isEmpty()) "Add photo" else "Change photo") }
                        if (form.photo.isNotEmpty()) {
                            TextButton(onClick = viewModel::removePhoto) { Text("Remove photo", color = WholesoulColors.Error) }
                        }
                    }
                }

                OutlinedTextField(
                    value = form.name,
                    onValueChange = viewModel::onNameChange,
                    label = { Text("Category name") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                    modifier = Modifier.fillMaxWidth(),
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Show to customers", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "Switch off to hide the category and all its items without deleting them.",
                            style = MaterialTheme.typography.bodySmall,
                            color = WholesoulColors.TextSecondary,
                        )
                    }
                    Switch(checked = form.isVisible, onCheckedChange = viewModel::onVisibleChange)
                }

                val error = state.error
                if (error != null) {
                    Text(error, color = WholesoulColors.Error, style = MaterialTheme.typography.bodyMedium)
                }

                PrimaryButton(
                    text = if (state.isSaving) "SAVING…" else "SAVE CATEGORY",
                    onClick = viewModel::save,
                    enabled = !state.isSaving && !state.isImportingPhoto,
                    modifier = Modifier.fillMaxWidth(),
                )
                if (!state.isNew) {
                    TextButton(onClick = { confirmDelete = true }, modifier = Modifier.fillMaxWidth()) {
                        Text("Delete this category", color = WholesoulColors.Error)
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this category?") },
            text = {
                Text(
                    if (state.itemCount > 0) "It still has ${state.itemCount} item(s). Move or delete them first — otherwise the category can't be deleted."
                    else "This can't be undone.",
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    viewModel.delete()
                }) { Text("Delete", color = WholesoulColors.Error) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}
