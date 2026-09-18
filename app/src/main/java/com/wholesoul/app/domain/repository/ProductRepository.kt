package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.model.ProductCategory

enum class SortOption { RELEVANCE, PRICE_LOW_TO_HIGH, PRICE_HIGH_TO_LOW, POPULARITY, NEWEST, DISCOUNT }

data class ProductFilter(
    val category: ProductCategory? = null,
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val minRating: Float? = null,
    val minDiscount: Int? = null,
    val inStockOnly: Boolean = false,
    val sortOption: SortOption = SortOption.RELEVANCE,
)

interface ProductRepository {
    suspend fun getAllProducts(): Result<List<Product>>
    suspend fun getProductById(id: String): Result<Product>
    suspend fun getProductsByCategory(category: ProductCategory, filter: ProductFilter = ProductFilter()): Result<List<Product>>
    suspend fun getRelatedProducts(product: Product, limit: Int = 10): Result<List<Product>>
    suspend fun searchProducts(query: String): Result<List<Product>>
    suspend fun getFreshToday(limit: Int = 10): Result<List<Product>>
    suspend fun getBestPrices(limit: Int = 10): Result<List<Product>>
    suspend fun getPopular(limit: Int = 10): Result<List<Product>>
    suspend fun getFlowersAndPuja(limit: Int = 10): Result<List<Product>>
    suspend fun getDailyEssentials(limit: Int = 10): Result<List<Product>>
}
