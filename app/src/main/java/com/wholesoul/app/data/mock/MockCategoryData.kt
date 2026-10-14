package com.wholesoul.app.data.mock

import com.wholesoul.app.data.catalog.DefaultCategory
import com.wholesoul.app.domain.model.Banner

object MockCategoryData {

    val banners: List<Banner> by lazy {
        listOf(
            Banner("b1", "banners/farm-fresh-vegetables", "Farm fresh vegetables", "Straight from the mandi to your kitchen", DefaultCategory.VEGETABLES.id),
            Banner("b2", "banners/fresh-flowers-morning", "Fresh flowers every morning", "Hand-picked blooms, delivered daily", DefaultCategory.FLOWERS.id),
            Banner("b3", "banners/direct-from-source", "Direct from source", "Fewer middlemen, better prices", null),
            Banner("b4", "banners/fresh-fruits-better-prices", "Fresh fruits at better prices", "Sweet, ripe and fairly priced", DefaultCategory.FRUITS.id),
            Banner("b5", "banners/puja-essentials", "Puja essentials, sorted", "Everything for your daily puja thali", DefaultCategory.PUJA_ITEMS.id),
            Banner("b6", "banners/daily-essentials", "Daily essentials, delivered", "Grocery and household in one basket", DefaultCategory.GROCERY.id),
        )
    }
}
