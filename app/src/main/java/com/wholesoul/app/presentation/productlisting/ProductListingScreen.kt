package com.wholesoul.app.presentation.productlisting

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.GenericErrorView
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.ProductCard
import com.wholesoul.app.core.designsystem.components.ProductCardSkeleton
import com.wholesoul.app.core.designsystem.components.WholesoulFilterChip
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.ProductFilter
import com.wholesoul.app.domain.repository.SortOption

private val sortLabels = mapOf(
    SortOption.RELEVANCE to "Relevance",
    SortOption.PRICE_LOW_TO_HIGH to "Price: Low to High",
    SortOption.PRICE_HIGH_TO_LOW to "Price: High to Low",
    SortOption.POPULARITY to "Popularity",
    SortOption.NEWEST to "Newest",
    SortOption.DISCOUNT to "Discount",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductListingScreen(
    onBack: () -> Unit,
    onProductClick: (Product) -> Unit,
    viewModel: ProductListingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val cartQuantities by viewModel.cartQuantities.collectAsState()
    var showFilterSheet by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(
            title = uiState.category.displayName,
            onBack = onBack,
            actions = {
                IconButton(onClick = { showFilterSheet = true }) {
                    Icon(Icons.Filled.FilterList, contentDescription = "Filter")
                }
                IconButton(onClick = viewModel::toggleView) {
                    Icon(
                        if (uiState.isGridView) Icons.Filled.ViewList else Icons.Filled.GridView,
                        contentDescription = "Toggle view",
                    )
                }
            },
        )

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf(SortOption.PRICE_LOW_TO_HIGH, SortOption.PRICE_HIGH_TO_LOW, SortOption.POPULARITY, SortOption.DISCOUNT).forEach { option ->
                WholesoulFilterChip(
                    label = sortLabels[option]!!,
                    selected = uiState.filter.sortOption == option,
                    onClick = { viewModel.updateSort(option) },
                )
            }
        }

        when (val state = uiState.products) {
            is UiState.Loading -> ProductListingLoading(uiState.isGridView)
            is UiState.Error -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Empty -> EmptyStateView(title = "No products found", message = state.message)
            is UiState.Success -> ProductListingContent(
                products = state.data,
                isGridView = uiState.isGridView,
                cartQuantities = cartQuantities,
                onProductClick = onProductClick,
                onAdd = viewModel::addToCart,
                onIncrement = { viewModel.increment(it.id) },
                onDecrement = { viewModel.decrement(it.id) },
            )
        }
    }

    if (showFilterSheet) {
        ModalBottomSheet(onDismissRequest = { showFilterSheet = false }) {
            FilterSheetContent(
                currentFilter = uiState.filter,
                onApply = { filter ->
                    viewModel.updateFilter(filter)
                    showFilterSheet = false
                },
            )
        }
    }
}

@Composable
private fun ProductListingContent(
    products: List<Product>,
    isGridView: Boolean,
    cartQuantities: Map<String, Int>,
    onProductClick: (Product) -> Unit,
    onAdd: (Product) -> Unit,
    onIncrement: (Product) -> Unit,
    onDecrement: (Product) -> Unit,
) {
    val imageProvider = LocalImageProvider.current
    if (isGridView) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(products, key = { it.id }) { product ->
                ProductCard(
                    product = product,
                    imageModel = imageProvider.resolve(product.imageKey),
                    cartQuantity = cartQuantities[product.id] ?: 0,
                    onClick = { onProductClick(product) },
                    onAdd = { onAdd(product) },
                    onIncrement = { onIncrement(product) },
                    onDecrement = { onDecrement(product) },
                )
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(products, key = { it.id }) { product ->
                ProductCard(
                    product = product,
                    imageModel = imageProvider.resolve(product.imageKey),
                    cartQuantity = cartQuantities[product.id] ?: 0,
                    onClick = { onProductClick(product) },
                    onAdd = { onAdd(product) },
                    onIncrement = { onIncrement(product) },
                    onDecrement = { onDecrement(product) },
                    modifier = Modifier.width(200.dp),
                )
            }
        }
    }
}

@Composable
private fun ProductListingLoading(isGridView: Boolean) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(if (isGridView) 2 else 1),
        contentPadding = PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(8) { ProductCardSkeleton() }
    }
}

@Composable
private fun FilterSheetContent(currentFilter: ProductFilter, onApply: (ProductFilter) -> Unit) {
    var minRating by remember { mutableStateOf(currentFilter.minRating) }
    var minDiscount by remember { mutableStateOf(currentFilter.minDiscount) }
    var inStockOnly by remember { mutableStateOf(currentFilter.inStockOnly) }

    Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
        Text("Filters", style = androidx.compose.material3.MaterialTheme.typography.titleLarge)

        Text("Rating", style = androidx.compose.material3.MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
            listOf(4.5f, 4f, 3.5f).forEach { rating ->
                WholesoulFilterChip(
                    label = "$rating★+",
                    selected = minRating == rating,
                    onClick = { minRating = if (minRating == rating) null else rating },
                )
            }
        }

        Text("Discount", style = androidx.compose.material3.MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
            listOf(10, 20, 30).forEach { discount ->
                WholesoulFilterChip(
                    label = "$discount% +",
                    selected = minDiscount == discount,
                    onClick = { minDiscount = if (minDiscount == discount) null else discount },
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Show in-stock only", style = androidx.compose.material3.MaterialTheme.typography.bodyMedium)
            androidx.compose.material3.Switch(checked = inStockOnly, onCheckedChange = { inStockOnly = it })
        }

        PrimaryButton(
            text = "APPLY FILTERS",
            onClick = {
                onApply(
                    currentFilter.copy(
                        minRating = minRating,
                        minDiscount = minDiscount,
                        inStockOnly = inStockOnly,
                    ),
                )
            },
            modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 12.dp),
        )
    }
}
