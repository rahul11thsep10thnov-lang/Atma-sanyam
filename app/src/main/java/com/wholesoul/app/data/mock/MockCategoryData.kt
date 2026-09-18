package com.wholesoul.app.data.mock

import com.wholesoul.app.domain.model.Banner
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.ProductCategory

object MockCategoryData {

    val categories: List<Category> by lazy {
        ProductCategory.entries.map { category ->
            val count = MockProductData.allProducts.count { it.category == category }
            Category(
                id = category.name.lowercase(),
                category = category,
                displayName = category.displayName,
                imageKey = "categories/${category.name.lowercase()}",
                productCount = count,
            )
        }
    }

    val banners: List<Banner> by lazy {
        listOf(
            Banner("b1", "banners/farm-fresh-vegetables", "Farm fresh vegetables", "Straight from the mandi to your kitchen", ProductCategory.VEGETABLES),
            Banner("b2", "banners/fresh-flowers-morning", "Fresh flowers every morning", "Hand-picked blooms, delivered daily", ProductCategory.FLOWERS),
            Banner("b3", "banners/direct-from-source", "Direct from source", "Fewer middlemen, better prices", null),
            Banner("b4", "banners/fresh-fruits-better-prices", "Fresh fruits at better prices", "Sweet, ripe and fairly priced", ProductCategory.FRUITS),
            Banner("b5", "banners/puja-essentials", "Puja essentials, sorted", "Everything for your daily puja thali", ProductCategory.PUJA_ITEMS),
            Banner("b6", "banners/daily-essentials", "Daily essentials, delivered", "Grocery and household in one basket", ProductCategory.GROCERY),
        )
    }
}
