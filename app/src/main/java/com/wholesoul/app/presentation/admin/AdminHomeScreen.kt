package com.wholesoul.app.presentation.admin

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SelectAll
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.WholesoulFilterChip
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.util.formatRupees
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.MoveDirection

@Composable
fun AdminHomeScreen(
    onBack: () -> Unit,
    onAddItem: (categoryId: String?) -> Unit,
    onEditItem: (String) -> Unit,
    onAddCategory: () -> Unit,
    onEditCategory: (String) -> Unit,
    viewModel: AdminHomeViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    var showMoveDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    val leave = {
        viewModel.lock()
        onBack()
    }
    // Back closes selection first, then leaves (and locks) the console.
    BackHandler { if (state.isSelecting) viewModel.clearSelection() else leave() }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            viewModel.consumeMessage()
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0.dp),
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            if (!state.isSelecting) {
                ExtendedFloatingActionButton(
                    onClick = {
                        if (state.tab == AdminTab.ITEMS) onAddItem(state.categoryFilter) else onAddCategory()
                    },
                    containerColor = WholesoulColors.Leaf,
                    contentColor = androidx.compose.ui.graphics.Color.White,
                    icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                    text = { Text(if (state.tab == AdminTab.ITEMS) "Add item" else "Add category") },
                )
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (state.isSelecting) {
                SelectionBar(
                    count = state.selectedIds.size,
                    allSelected = state.allShownSelected,
                    onClose = viewModel::clearSelection,
                    onSelectAll = viewModel::toggleSelectAll,
                    onShow = viewModel::showSelected,
                    onHide = viewModel::hideSelected,
                    onMove = { showMoveDialog = true },
                    onDelete = { showDeleteDialog = true },
                )
            } else {
                WholesoulTopBar(
                    title = "Admin Console",
                    onBack = leave,
                    actions = {
                        IconButton(onClick = leave) {
                            Icon(Icons.Filled.Lock, contentDescription = "Lock and exit")
                        }
                    },
                )
            }

            TabRow(selectedTabIndex = state.tab.ordinal) {
                Tab(
                    selected = state.tab == AdminTab.ITEMS,
                    onClick = { viewModel.selectTab(AdminTab.ITEMS) },
                    text = { Text("Items (${state.products.size})") },
                )
                Tab(
                    selected = state.tab == AdminTab.CATEGORIES,
                    onClick = { viewModel.selectTab(AdminTab.CATEGORIES) },
                    text = { Text("Categories (${state.categories.size})") },
                )
            }

            when (state.tab) {
                AdminTab.ITEMS -> ItemsTab(
                    state = state,
                    onQueryChange = viewModel::onQueryChange,
                    onFilter = viewModel::filterByCategory,
                    onItemClick = { id -> if (state.isSelecting) viewModel.toggleSelected(id) else onEditItem(id) },
                    onItemLongClick = viewModel::toggleSelected,
                    onSelectAll = viewModel::toggleSelectAll,
                    onMove = viewModel::moveItem,
                )
                AdminTab.CATEGORIES -> CategoriesTab(
                    categories = state.categories,
                    onClick = onEditCategory,
                    onMove = viewModel::moveCategory,
                )
            }
        }
    }

    if (showMoveDialog) {
        MoveToCategoryDialog(
            categories = state.categories,
            onPick = { categoryId ->
                showMoveDialog = false
                viewModel.moveSelectedTo(categoryId)
            },
            onDismiss = { showMoveDialog = false },
        )
    }

    if (showDeleteDialog) {
        val count = state.selectedIds.size
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(if (count == 1) "Delete 1 item?" else "Delete $count items?") },
            text = { Text("They will be removed from the shop for good. To keep them but stop customers seeing them, use Hide instead.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    viewModel.deleteSelected()
                }) { Text("Delete", color = WholesoulColors.Error) }
            },
            dismissButton = { TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun SelectionBar(
    count: Int,
    allSelected: Boolean,
    onClose: () -> Unit,
    onSelectAll: () -> Unit,
    onShow: () -> Unit,
    onHide: () -> Unit,
    onMove: () -> Unit,
    onDelete: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().height(64.dp).padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = "Clear selection") }
        Text("$count selected", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        IconButton(onClick = onSelectAll) {
            Icon(
                Icons.Filled.SelectAll,
                contentDescription = if (allSelected) "Clear all" else "Select all",
                tint = if (allSelected) WholesoulColors.Leaf else WholesoulColors.TextPrimary,
            )
        }
        IconButton(onClick = onShow) { Icon(Icons.Filled.Visibility, contentDescription = "Show to customers") }
        IconButton(onClick = onHide) { Icon(Icons.Filled.VisibilityOff, contentDescription = "Hide from customers") }
        IconButton(onClick = onMove) { Icon(Icons.Filled.Folder, contentDescription = "Move to category") }
        IconButton(onClick = onDelete) { Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = WholesoulColors.Error) }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ItemsTab(
    state: AdminHomeUiState,
    onQueryChange: (String) -> Unit,
    onFilter: (String?) -> Unit,
    onItemClick: (String) -> Unit,
    onItemLongClick: (String) -> Unit,
    onSelectAll: () -> Unit,
    onMove: (String, MoveDirection) -> Unit,
) {
    val shown = state.shownProducts
    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = state.query,
            onValueChange = onQueryChange,
            placeholder = { Text("Search your items") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp),
        )
        LazyRow(
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item { WholesoulFilterChip(label = "All", selected = state.categoryFilter == null, onClick = { onFilter(null) }) }
            items(state.categories, key = { it.id }) { category ->
                WholesoulFilterChip(
                    label = category.displayName,
                    selected = state.categoryFilter == category.id,
                    onClick = { onFilter(category.id) },
                )
            }
        }
        if (shown.isEmpty()) {
            EmptyStateView(
                title = if (state.products.isEmpty()) "No items yet" else "Nothing matches",
                message = if (state.products.isEmpty()) "Tap “Add item” to list your first product." else "Try another search or category.",
            )
            return@Column
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                if (state.canReorderItems) "${shown.size} items · use the arrows to set their order" else "${shown.size} items · long-press to select",
                style = MaterialTheme.typography.bodySmall,
                color = WholesoulColors.TextSecondary,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onSelectAll) { Text(if (state.allShownSelected) "Clear all" else "Select all") }
        }
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 96.dp)) {
            itemsIndexed(shown, key = { _, product -> product.id }) { index, product ->
                ProductRow(
                    product = product,
                    categoryName = state.categoryName(product.categoryId),
                    selecting = state.isSelecting,
                    selected = product.id in state.selectedIds,
                    showReorder = state.canReorderItems && !state.isSelecting,
                    canMoveUp = index > 0,
                    canMoveDown = index < shown.lastIndex,
                    modifier = Modifier.combinedClickable(
                        onClick = { onItemClick(product.id) },
                        onLongClick = { onItemLongClick(product.id) },
                    ),
                    onMove = { direction -> onMove(product.id, direction) },
                    onCheckedChange = { onItemLongClick(product.id) },
                )
                HorizontalDivider(color = WholesoulColors.Divider)
            }
        }
    }
}

@Composable
private fun ProductRow(
    product: Product,
    categoryName: String,
    selecting: Boolean,
    selected: Boolean,
    showReorder: Boolean,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    modifier: Modifier,
    onMove: (MoveDirection) -> Unit,
    onCheckedChange: () -> Unit,
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (selecting) {
            Checkbox(checked = selected, onCheckedChange = { onCheckedChange() })
            Spacer(Modifier.width(4.dp))
        }
        AdminThumbnail(imageKey = product.imageKey, description = product.name)
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(product.name, style = MaterialTheme.typography.bodyLarge, maxLines = 2)
            Text(
                "${formatRupees(product.price)}  ·  listed ${formatRupees(product.mrp)}",
                style = MaterialTheme.typography.bodySmall,
                color = WholesoulColors.TextSecondary,
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(categoryName, style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextTertiary)
                if (product.stock <= 0) AdminTag("Sold out", warning = true) else AdminTag("Qty ${product.stock}")
                if (!product.isActive) AdminTag("Hidden")
            }
        }
        if (showReorder) {
            ReorderButtons(
                canMoveUp = canMoveUp,
                canMoveDown = canMoveDown,
                onMoveUp = { onMove(MoveDirection.UP) },
                onMoveDown = { onMove(MoveDirection.DOWN) },
                subject = product.name,
            )
        }
    }
}

@Composable
private fun CategoriesTab(
    categories: List<Category>,
    onClick: (String) -> Unit,
    onMove: (String, MoveDirection) -> Unit,
) {
    if (categories.isEmpty()) {
        EmptyStateView(title = "No categories yet", message = "Tap “Add category” to create your first one, then add items to it.")
        return
    }
    LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 96.dp)) {
        item {
            Text(
                "Use the arrows to set the order customers see.",
                style = MaterialTheme.typography.bodySmall,
                color = WholesoulColors.TextSecondary,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            )
        }
        itemsIndexed(categories, key = { _, category -> category.id }) { index, category ->
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onClick(category.id) }.padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AdminThumbnail(imageKey = category.imageKey, description = category.displayName)
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(category.displayName, style = MaterialTheme.typography.bodyLarge)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            if (category.productCount == 1) "1 item" else "${category.productCount} items",
                            style = MaterialTheme.typography.bodySmall,
                            color = WholesoulColors.TextSecondary,
                        )
                        if (!category.isActive) AdminTag("Hidden")
                    }
                }
                ReorderButtons(
                    canMoveUp = index > 0,
                    canMoveDown = index < categories.lastIndex,
                    onMoveUp = { onMove(category.id, MoveDirection.UP) },
                    onMoveDown = { onMove(category.id, MoveDirection.DOWN) },
                    subject = category.displayName,
                )
            }
            HorizontalDivider(color = WholesoulColors.Divider)
        }
    }
}

@Composable
private fun MoveToCategoryDialog(
    categories: List<Category>,
    onPick: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Move to which category?") },
        text = {
            LazyColumn {
                items(categories, key = { it.id }) { category ->
                    Text(
                        category.displayName,
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.fillMaxWidth().clickable { onPick(category.id) }.padding(vertical = 12.dp),
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
