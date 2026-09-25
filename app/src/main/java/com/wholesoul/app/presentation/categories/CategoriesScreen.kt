package com.wholesoul.app.presentation.categories

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.GenericErrorView
import com.wholesoul.app.core.designsystem.components.ProductCardSkeleton
import com.wholesoul.app.core.designsystem.components.WholesoulImage
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.ProductCategory

@Composable
fun CategoriesScreen(
    onCategoryClick: (ProductCategory) -> Unit,
    viewModel: CategoriesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Categories")
        when (val state = uiState) {
            is UiState.Loading -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(8) { ProductCardSkeleton(Modifier.aspectRatio(1.1f)) }
            }
            is UiState.Error -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Empty -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Success -> CategoryGrid(state.data, onCategoryClick)
        }
    }
}

@Composable
private fun CategoryGrid(categories: List<Category>, onCategoryClick: (ProductCategory) -> Unit) {
    val imageProvider = LocalImageProvider.current
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(categories, key = { it.id }) { category ->
            Card(
                modifier = Modifier.aspectRatio(1.1f).clickable { onCategoryClick(category.category) },
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
            ) {
                Column(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                    WholesoulImage(
                        model = imageProvider.resolve(category.imageKey),
                        contentDescription = category.displayName,
                        modifier = Modifier.fillMaxWidth().aspectRatio(1.6f),
                    )
                    Text(category.displayName, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp))
                    Text(
                        "${category.productCount} products",
                        style = MaterialTheme.typography.bodySmall,
                        color = WholesoulColors.TextSecondary,
                    )
                }
            }
        }
    }
}
