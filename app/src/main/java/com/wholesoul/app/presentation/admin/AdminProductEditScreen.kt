package com.wholesoul.app.presentation.admin

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar

@Composable
fun AdminProductEditScreen(
    onBack: () -> Unit,
    viewModel: AdminProductEditViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(state.finished) { if (state.finished) onBack() }

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(AdminProductEditViewModel.MAX_PHOTOS),
    ) { uris -> viewModel.addPhotos(uris.map { it.toString() }) }

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = if (state.isNew) "Add item" else "Edit item", onBack = onBack)
        when {
            state.isLoading -> Box(Modifier.fillMaxSize())
            state.notFound -> EmptyStateView(title = "Item not found", message = "It may have been deleted.")
            else -> ProductFormContent(
                state = state,
                viewModel = viewModel,
                onPickPhotos = { photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                onDelete = { confirmDelete = true },
            )
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this item?") },
            text = { Text("It will be removed from the shop for good. To keep it but stop customers seeing it, switch off “Show to customers” instead.") },
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProductFormContent(
    state: ProductEditUiState,
    viewModel: AdminProductEditViewModel,
    onPickPhotos: () -> Unit,
    onDelete: () -> Unit,
) {
    val form = state.form
    var categoryMenuOpen by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Photos", style = MaterialTheme.typography.titleSmall)
        PhotoStrip(
            photos = form.photos,
            isImporting = state.isImportingPhotos,
            canAddMore = form.photos.size < AdminProductEditViewModel.MAX_PHOTOS,
            onAdd = onPickPhotos,
            onRemove = viewModel::removePhoto,
            onMakeMain = viewModel::makeMainPhoto,
        )
        Text(
            if (form.photos.isEmpty()) "No photo yet — customers will see a plain placeholder." else "The first photo is the main one. Tap a photo to make it the main photo.",
            style = MaterialTheme.typography.bodySmall,
            color = WholesoulColors.TextSecondary,
        )

        OutlinedTextField(
            value = form.name,
            onValueChange = { value -> viewModel.update { it.copy(name = value) } },
            label = { Text("Item name") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
            modifier = Modifier.fillMaxWidth(),
        )

        ExposedDropdownMenuBox(expanded = categoryMenuOpen, onExpandedChange = { categoryMenuOpen = it }) {
            OutlinedTextField(
                value = state.categories.firstOrNull { it.id == form.categoryId }?.displayName.orEmpty(),
                onValueChange = {},
                readOnly = true,
                label = { Text("Category") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryMenuOpen) },
                modifier = Modifier.menuAnchor().fillMaxWidth(),
            )
            ExposedDropdownMenu(expanded = categoryMenuOpen, onDismissRequest = { categoryMenuOpen = false }) {
                state.categories.forEach { category ->
                    DropdownMenuItem(
                        text = { Text(category.displayName) },
                        onClick = {
                            viewModel.update { it.copy(categoryId = category.id) }
                            categoryMenuOpen = false
                        },
                    )
                }
            }
        }
        if (state.categories.isEmpty()) {
            Text(
                "Create a category first (Categories tab), then come back to add items.",
                style = MaterialTheme.typography.bodySmall,
                color = WholesoulColors.Error,
            )
        }

        OutlinedTextField(
            value = form.description,
            onValueChange = { value -> viewModel.update { it.copy(description = value) } },
            label = { Text("Description") },
            minLines = 3,
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
            modifier = Modifier.fillMaxWidth(),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = form.listedPrice,
                onValueChange = { value -> viewModel.update { it.copy(listedPrice = value) } },
                label = { Text("Listed price (MRP) ₹") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = form.sellingPrice,
                onValueChange = { value -> viewModel.update { it.copy(sellingPrice = value) } },
                label = { Text("Selling price ₹") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.weight(1f),
            )
        }
        if (state.discountPercent > 0) {
            Text("Customers will see ${state.discountPercent}% OFF", style = MaterialTheme.typography.bodySmall, color = WholesoulColors.Discount)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = form.quantity,
                onValueChange = { value -> viewModel.update { it.copy(quantity = value.filter(Char::isDigit)) } },
                label = { Text("Quantity available") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = form.weightLabel,
                onValueChange = { value -> viewModel.update { it.copy(weightLabel = value) } },
                label = { Text("Pack size (e.g. 500 g)") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = form.brand,
                onValueChange = { value -> viewModel.update { it.copy(brand = value) } },
                label = { Text("Brand (optional)") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = form.subCategory,
                onValueChange = { value -> viewModel.update { it.copy(subCategory = value) } },
                label = { Text("Sub-category (optional)") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Show to customers", style = MaterialTheme.typography.bodyLarge)
                Text("Switch off to hide it without deleting.", style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary)
            }
            Switch(checked = form.isVisible, onCheckedChange = { value -> viewModel.update { it.copy(isVisible = value) } })
        }

        if (state.error != null) {
            Text(state.error, color = WholesoulColors.Error, style = MaterialTheme.typography.bodyMedium)
        }

        PrimaryButton(
            text = if (state.isSaving) "SAVING…" else "SAVE ITEM",
            onClick = viewModel::save,
            enabled = !state.isSaving && !state.isImportingPhotos,
            modifier = Modifier.fillMaxWidth(),
        )
        if (!state.isNew) {
            TextButton(onClick = onDelete, modifier = Modifier.fillMaxWidth()) {
                Text("Delete this item", color = WholesoulColors.Error)
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun PhotoStrip(
    photos: List<String>,
    isImporting: Boolean,
    canAddMore: Boolean,
    onAdd: () -> Unit,
    onRemove: (String) -> Unit,
    onMakeMain: (String) -> Unit,
) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        items(photos, key = { it }) { key ->
            val isMain = key == photos.first()
            Box {
                AdminThumbnail(
                    imageKey = key,
                    description = if (isMain) "Main photo" else "Photo",
                    size = 96.dp,
                    modifier = Modifier
                        .then(if (isMain) Modifier.border(2.dp, WholesoulColors.Leaf, RoundedCornerShape(10.dp)) else Modifier)
                        .clickable(enabled = !isMain, onClickLabel = "Make main photo") { onMakeMain(key) },
                )
                if (isMain) {
                    AdminTag("Main", modifier = Modifier.align(Alignment.BottomStart).padding(4.dp))
                }
                IconButton(onClick = { onRemove(key) }, modifier = Modifier.align(Alignment.TopEnd).size(32.dp)) {
                    Icon(Icons.Filled.Close, contentDescription = "Remove photo", tint = WholesoulColors.Error)
                }
            }
        }
        item {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .border(1.dp, WholesoulColors.Divider, RoundedCornerShape(10.dp))
                    .clickable(enabled = canAddMore && !isImporting, onClickLabel = "Add photos", onClick = onAdd),
                contentAlignment = Alignment.Center,
            ) {
                if (isImporting) {
                    Text("Adding…", style = MaterialTheme.typography.bodySmall)
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Filled.AddPhotoAlternate, contentDescription = null, tint = if (canAddMore) WholesoulColors.Leaf else WholesoulColors.TextTertiary)
                        Text("Add photo", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}
