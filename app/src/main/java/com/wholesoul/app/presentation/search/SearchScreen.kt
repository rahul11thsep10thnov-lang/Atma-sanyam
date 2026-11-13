package com.wholesoul.app.presentation.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.GenericErrorView
import com.wholesoul.app.core.designsystem.components.ProductCard
import com.wholesoul.app.core.designsystem.components.ProductCardSkeleton
import com.wholesoul.app.core.designsystem.components.WholesoulFilterChip
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Product

@Composable
fun SearchScreen(
    onProductClick: (Product) -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val cartQuantities by viewModel.cartQuantities.collectAsState()
    val focusManager = LocalFocusManager.current

    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::onQueryChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("What are you looking for?") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                singleLine = true,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                    onSearch = {
                        viewModel.onSearchSubmitted(state.query)
                        focusManager.clearFocus()
                    },
                ),
            )
        }

        when (val results = state.results) {
            null -> SearchSuggestions(
                recentSearches = state.recentSearches,
                onSuggestionClick = { viewModel.onQueryChange(it); viewModel.onSearchSubmitted(it) },
                onClearRecent = viewModel::clearRecentSearches,
            )
            is UiState.Loading -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) { items(6) { ProductCardSkeleton() } }
            is UiState.Error -> GenericErrorView(onRetry = { viewModel.onQueryChange(state.query) })
            is UiState.Empty -> EmptyStateView(title = results.message, message = "Try searching for tomato, rose or milk instead.")
            is UiState.Success -> {
                val imageProvider = LocalImageProvider.current
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(results.data, key = { it.id }) { product ->
                        ProductCard(
                            product = product,
                            imageModel = imageProvider.resolve(product.imageKey),
                            cartQuantity = cartQuantities[product.id] ?: 0,
                            onClick = { onProductClick(product) },
                            onAdd = { viewModel.addToCart(product) },
                            onIncrement = { viewModel.increment(product.id) },
                            onDecrement = { viewModel.decrement(product.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchSuggestions(
    recentSearches: List<String>,
    onSuggestionClick: (String) -> Unit,
    onClearRecent: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        if (recentSearches.isNotEmpty()) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Recent searches", style = MaterialTheme.typography.titleSmall)
                TextButton(onClick = onClearRecent) { Text("CLEAR") }
            }
            SuggestionChipsFlow(recentSearches, onSuggestionClick)
        }

        Text("Popular searches", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 20.dp))
        SuggestionChipsFlow(POPULAR_SEARCHES, onSuggestionClick)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SuggestionChipsFlow(items: List<String>, onClick: (String) -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(top = 10.dp, bottom = 6.dp),
    ) {
        items.forEach { label ->
            WholesoulFilterChip(label = label, selected = false, onClick = { onClick(label) })
        }
    }
}
