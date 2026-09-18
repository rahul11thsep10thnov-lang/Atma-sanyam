package com.wholesoul.app.core.designsystem.components

import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.domain.model.Product

/**
 * A titled horizontal shelf of [ProductCard]s — the building block for every "Fresh Today",
 * "Best Prices", "Popular Near You" etc. section on Home (spec section 9).
 */
@Composable
fun ProductRail(
    title: String,
    products: List<Product>,
    cartQuantities: Map<String, Int>,
    onProductClick: (Product) -> Unit,
    onAdd: (Product) -> Unit,
    onIncrement: (Product) -> Unit,
    onDecrement: (Product) -> Unit,
    modifier: Modifier = Modifier,
    trailingAction: (@Composable () -> Unit)? = null,
) {
    if (products.isEmpty()) return
    val imageProvider = LocalImageProvider.current

    Column(modifier = modifier.padding(top = 20.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            trailingAction?.invoke()
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.padding(top = 10.dp),
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
                    modifier = Modifier.width(150.dp),
                )
            }
        }
    }
}
