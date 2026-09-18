package com.wholesoul.app.presentation.productdetails

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.AddOrQuantitySelector
import com.wholesoul.app.core.designsystem.components.DiscountLabel
import com.wholesoul.app.core.designsystem.components.GenericErrorView
import com.wholesoul.app.core.designsystem.components.PriceTag
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.ProductRail
import com.wholesoul.app.core.designsystem.components.RatingBadge
import com.wholesoul.app.core.designsystem.components.WholesoulFilterChip
import com.wholesoul.app.core.designsystem.components.WholesoulImage
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Product

@Composable
fun ProductDetailsScreen(
    onBack: () -> Unit,
    onProductClick: (Product) -> Unit,
    onGoToCart: () -> Unit,
    viewModel: ProductDetailsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val cartQuantities by viewModel.cartQuantities.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(
            title = "Product details",
            onBack = onBack,
            actions = {
                val state = uiState
                if (state is UiState.Success) {
                    IconButton(onClick = { viewModel.toggleWishlist(state.data.product) }) {
                        Icon(
                            if (state.data.isWishlisted) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = "Wishlist",
                            tint = if (state.data.isWishlisted) WholesoulColors.Discount else WholesoulColors.TextSecondary,
                        )
                    }
                }
            },
        )

        when (val state = uiState) {
            is UiState.Loading -> androidx.compose.foundation.layout.Box(Modifier.fillMaxSize())
            is UiState.Error -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Empty -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Success -> ProductDetailsContentView(
                content = state.data,
                cartQuantity = cartQuantities[state.data.product.id] ?: 0,
                onProductClick = onProductClick,
                onAdd = { viewModel.addToCart(state.data.product) },
                onIncrement = { viewModel.increment(state.data.product.id) },
                onDecrement = { viewModel.decrement(state.data.product.id) },
                onBuyNow = {
                    if ((cartQuantities[state.data.product.id] ?: 0) == 0) viewModel.addToCart(state.data.product)
                    onGoToCart()
                },
                onRelatedProductClick = onProductClick,
                relatedCartQuantities = cartQuantities,
                onRelatedAdd = { viewModel.addToCart(it) },
                onRelatedIncrement = { viewModel.increment(it.id) },
                onRelatedDecrement = { viewModel.decrement(it.id) },
            )
        }
    }
}

@Composable
private fun ProductDetailsContentView(
    content: ProductDetailsContent,
    cartQuantity: Int,
    onProductClick: (Product) -> Unit,
    onAdd: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    onBuyNow: () -> Unit,
    onRelatedProductClick: (Product) -> Unit,
    relatedCartQuantities: Map<String, Int>,
    onRelatedAdd: (Product) -> Unit,
    onRelatedIncrement: (Product) -> Unit,
    onRelatedDecrement: (Product) -> Unit,
) {
    val product = content.product
    val imageProvider = LocalImageProvider.current
    val scrollState = rememberScrollState()

    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.weight(1f).verticalScroll(scrollState)) {
            WholesoulImage(
                model = imageProvider.resolve(product.imageKey),
                contentDescription = product.name,
                modifier = Modifier.fillMaxWidth().height(280.dp),
            )

            Column(modifier = Modifier.padding(16.dp)) {
                Text(product.name, style = MaterialTheme.typography.headlineSmall)
                Text(product.weightLabel, style = MaterialTheme.typography.bodyMedium, color = WholesoulColors.TextSecondary)
                Spacer(Modifier.height(6.dp))
                RatingBadge(product.rating, product.reviewCount)
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    PriceTag(price = product.price, mrp = product.mrp)
                    Spacer(Modifier.width(10.dp))
                    DiscountLabel(product.discountPercent)
                }

                if (product.availableQuantities.size > 1) {
                    Text("Available quantities", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                        product.availableQuantities.forEach { qty ->
                            WholesoulFilterChip(label = qty, selected = qty == product.weightLabel, onClick = {})
                        }
                    }
                }

                Text("Description", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 20.dp))
                Text(product.description, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))

                if (product.benefits.isNotEmpty()) {
                    Text("Benefits", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp))
                    product.benefits.forEach { benefit ->
                        Text("• $benefit", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                    }
                }

                Text("Origin", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp))
                Text(product.origin, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))

                product.freshnessInfo?.let { freshness ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                        colors = CardDefaults.cardColors(containerColor = WholesoulColors.LeafLight),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Freshness information", style = MaterialTheme.typography.titleSmall, color = WholesoulColors.LeafDark)
                            Text("Harvested ${freshness.harvestedDaysAgo} day(s) ago", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                            Text("Source: ${freshness.sourceFarm}", style = MaterialTheme.typography.bodySmall)
                            Text("Quality grade: ${freshness.qualityGrade}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                product.flowerInfo?.let { flower ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                        colors = CardDefaults.cardColors(containerColor = WholesoulColors.PrimaryLight),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Flower details", style = MaterialTheme.typography.titleSmall, color = WholesoulColors.Soil)
                            Text("Type: ${flower.flowerType}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                            Text("Weight per bunch: ${flower.weightPerBunchGrams} g", style = MaterialTheme.typography.bodySmall)
                            Text("Approx. count: ${flower.approxCount}", style = MaterialTheme.typography.bodySmall)
                            Text("Best for: ${flower.useCase}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            ProductRail(
                title = "Related products",
                products = content.relatedProducts,
                cartQuantities = relatedCartQuantities,
                onProductClick = onRelatedProductClick,
                onAdd = onRelatedAdd,
                onIncrement = onRelatedIncrement,
                onDecrement = onRelatedDecrement,
                modifier = Modifier.padding(bottom = 16.dp),
            )
        }

        Surface(shadowElevation = 8.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                AddOrQuantitySelector(
                    quantity = cartQuantity,
                    onAdd = onAdd,
                    onIncrement = onIncrement,
                    onDecrement = onDecrement,
                    modifier = Modifier.weight(1f),
                )
                PrimaryButton(text = "BUY NOW", onClick = onBuyNow, modifier = Modifier.weight(1f))
            }
        }
    }
}
