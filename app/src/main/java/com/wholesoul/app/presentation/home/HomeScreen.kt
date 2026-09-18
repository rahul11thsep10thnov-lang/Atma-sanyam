package com.wholesoul.app.presentation.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.GenericErrorView
import com.wholesoul.app.core.designsystem.components.ProductRail
import com.wholesoul.app.core.designsystem.components.WholesoulImage
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.model.ProductCategory

@Composable
fun HomeScreen(
    onAddressClick: () -> Unit,
    onSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onCategoryClick: (ProductCategory) -> Unit,
    onProductClick: (Product) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val cartQuantities by viewModel.cartQuantities.collectAsState()
    val deliveryLabel by viewModel.deliveryLabel.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        HomeTopBar(
            deliveryLabel = deliveryLabel,
            onAddressClick = onAddressClick,
            onSearchClick = onSearchClick,
            onNotificationsClick = onNotificationsClick,
        )

        when (val state = uiState) {
            is UiState.Loading -> HomeLoadingContent()
            is UiState.Error -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Empty -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Success -> HomeContentList(
                content = state.data,
                cartQuantities = cartQuantities,
                onCategoryClick = onCategoryClick,
                onProductClick = onProductClick,
                onAdd = viewModel::addToCart,
                onIncrement = { viewModel.increment(it.id) },
                onDecrement = { viewModel.decrement(it.id) },
            )
        }
    }
}

@Composable
private fun HomeTopBar(
    deliveryLabel: String,
    onAddressClick: () -> Unit,
    onSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit,
) {
    Surface(color = WholesoulColors.Primary) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("WHOLESOUL", style = MaterialTheme.typography.titleLarge, color = WholesoulColors.OnPrimary)
                Icon(
                    Icons.Filled.Notifications,
                    contentDescription = "Notifications",
                    tint = WholesoulColors.OnPrimary,
                    modifier = Modifier.clickable(onClick = onNotificationsClick),
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.clickable(onClick = onAddressClick),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.LocationOn, contentDescription = null, tint = WholesoulColors.Soil, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text("Deliver to", style = MaterialTheme.typography.bodySmall, color = WholesoulColors.Soil)
                Spacer(Modifier.width(4.dp))
                Text(
                    deliveryLabel,
                    style = MaterialTheme.typography.labelLarge,
                    color = WholesoulColors.OnPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = WholesoulColors.OnPrimary)
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(WholesoulColors.Background)
                    .clickable(onClick = onSearchClick)
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Search, contentDescription = null, tint = WholesoulColors.TextTertiary)
                Spacer(Modifier.width(8.dp))
                Text("What are you looking for?", color = WholesoulColors.TextTertiary, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun HomeContentList(
    content: HomeContent,
    cartQuantities: Map<String, Int>,
    onCategoryClick: (ProductCategory) -> Unit,
    onProductClick: (Product) -> Unit,
    onAdd: (Product) -> Unit,
    onIncrement: (Product) -> Unit,
    onDecrement: (Product) -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            BannerCarousel(content.banners.map { it.imageKey to it.title })
        }
        item {
            CategoryRow(content.categories, onCategoryClick)
        }
        item {
            ProductRail("Fresh Today", content.freshToday, cartQuantities, onProductClick, onAdd, onIncrement, onDecrement)
        }
        item {
            ProductRail("Best Prices", content.bestPrices, cartQuantities, onProductClick, onAdd, onIncrement, onDecrement)
        }
        item {
            ProductRail("Popular Near You", content.popular, cartQuantities, onProductClick, onAdd, onIncrement, onDecrement)
        }
        item {
            ProductRail("Flowers & Puja", content.flowersAndPuja, cartQuantities, onProductClick, onAdd, onIncrement, onDecrement)
        }
        item {
            ProductRail("Daily Essentials", content.dailyEssentials, cartQuantities, onProductClick, onAdd, onIncrement, onDecrement)
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun BannerCarousel(banners: List<Pair<String, String>>) {
    if (banners.isEmpty()) return
    val imageProvider = LocalImageProvider.current
    val pagerState = rememberPagerState(pageCount = { banners.size })

    HorizontalPager(
        state = pagerState,
        modifier = Modifier.fillMaxWidth().padding(16.dp).height(140.dp),
        pageSpacing = 10.dp,
    ) { page ->
        val (imageKey, title) = banners[page]
        Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp))) {
            WholesoulImage(model = imageProvider.resolve(imageKey), contentDescription = title, modifier = Modifier.fillMaxSize())
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.15f)),
            )
            Text(
                title,
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.align(Alignment.BottomStart).padding(12.dp),
            )
        }
    }
}

@Composable
private fun CategoryRow(categories: List<Category>, onCategoryClick: (ProductCategory) -> Unit) {
    val imageProvider = LocalImageProvider.current
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.padding(vertical = 8.dp),
    ) {
        items(categories, key = { it.id }) { category ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.width(64.dp).clickable { onCategoryClick(category.category) },
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(WholesoulColors.LeafLight),
                ) {
                    WholesoulImage(model = imageProvider.resolve(category.imageKey), contentDescription = category.displayName, modifier = Modifier.fillMaxSize())
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    category.displayName,
                    style = MaterialTheme.typography.labelSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun HomeLoadingContent() {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(14.dp)),
        ) {
            com.wholesoul.app.core.designsystem.components.SkeletonBlock(Modifier.fillMaxSize())
        }
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(3) {
                com.wholesoul.app.core.designsystem.components.ProductCardSkeleton(Modifier.width(150.dp).aspectRatio(0.75f))
            }
        }
    }
}
