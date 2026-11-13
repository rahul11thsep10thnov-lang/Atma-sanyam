package com.wholesoul.app.presentation.wishlist

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.PriceTag
import com.wholesoul.app.core.designsystem.components.WholesoulImage
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.domain.model.Product

@Composable
fun WishlistScreen(
    onProductClick: (Product) -> Unit,
    viewModel: WishlistViewModel = hiltViewModel(),
) {
    val products by viewModel.wishlistProducts.collectAsState()
    val imageProvider = LocalImageProvider.current

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Wishlist")

        if (products.isEmpty()) {
            EmptyStateView(
                title = "Your wishlist is empty",
                message = "Tap the heart icon on any product to save it here.",
                icon = Icons.Filled.FavoriteBorder,
            )
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                items(products, key = { it.id }) { product ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            WholesoulImage(
                                model = imageProvider.resolve(product.imageKey),
                                contentDescription = product.name,
                                modifier = Modifier.size(64.dp).clip(RoundedCornerShape(10.dp)),
                            )
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(start = 12.dp)
                                    .clickable(onClick = { onProductClick(product) }),
                            ) {
                                Text(product.name, style = MaterialTheme.typography.bodyMedium, maxLines = 2)
                                Text(product.weightLabel, style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary)
                                PriceTag(price = product.price, mrp = product.mrp, modifier = Modifier.padding(top = 4.dp))
                            }
                            IconButton(onClick = { viewModel.addToCart(product.id) }) {
                                Text("ADD", style = MaterialTheme.typography.labelMedium, color = WholesoulColors.Leaf)
                            }
                            IconButton(onClick = { viewModel.remove(product.id) }) {
                                Icon(Icons.Filled.DeleteOutline, contentDescription = "Remove", tint = WholesoulColors.TextTertiary)
                            }
                        }
                    }
                }
            }
        }
    }
}
