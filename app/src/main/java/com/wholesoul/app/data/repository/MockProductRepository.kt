package com.wholesoul.app.data.repository

import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.model.ProductCategory
import com.wholesoul.app.domain.repository.ProductFilter
import com.wholesoul.app.domain.repository.ProductRepository
import com.wholesoul.app.domain.repository.SortOption
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockProductRepository @Inject constructor() : ProductRepository {

    private val products get() = MockProductData.allProducts
    private val byId by lazy { products.associateBy { it.id } }

    private suspend fun simulateNetwork() = delay(Constants.NETWORK_SIMULATED_DELAY_MS)

    override suspend fun getAllProducts(): Result<List<Product>> {
        simulateNetwork()
        return Result.success(products)
    }

    override suspend fun getProductById(id: String): Result<Product> {
        simulateNetwork()
        return byId[id]?.let { Result.success(it) }
            ?: Result.failure(NoSuchElementException("Product unavailable"))
    }

    override suspend fun getProductsByCategory(category: ProductCategory, filter: ProductFilter): Result<List<Product>> {
        simulateNetwork()
        var list = products.filter { it.category == category }
        list = applyFilter(list, filter)
        return Result.success(list)
    }

    override suspend fun getRelatedProducts(product: Product, limit: Int): Result<List<Product>> {
        simulateNetwork()
        val related = products
            .filter { it.id != product.id && (it.category == product.category || it.subCategory == product.subCategory) }
            .take(limit)
        return Result.success(related)
    }

    override suspend fun searchProducts(query: String): Result<List<Product>> {
        simulateNetwork()
        if (query.isBlank()) return Result.success(emptyList())
        val q = query.trim().lowercase()
        val results = products.filter { product ->
            product.name.lowercase().contains(q) ||
                product.tags.any { it.contains(q) } ||
                product.category.displayName.lowercase().contains(q)
        }
        return Result.success(results)
    }

    override suspend fun getFreshToday(limit: Int): Result<List<Product>> {
        simulateNetwork()
        return Result.success(
            products.filter { it.category == ProductCategory.FRUITS || it.category == ProductCategory.VEGETABLES }
                .sortedByDescending { it.freshnessInfo?.harvestedDaysAgo?.let { d -> -d } ?: 0 }
                .take(limit),
        )
    }

    override suspend fun getBestPrices(limit: Int): Result<List<Product>> {
        simulateNetwork()
        return Result.success(products.filter { it.discountPercent >= 16 }.sortedByDescending { it.discountPercent }.take(limit))
    }

    override suspend fun getPopular(limit: Int): Result<List<Product>> {
        simulateNetwork()
        return Result.success(products.sortedByDescending { it.reviewCount * it.rating }.take(limit))
    }

    override suspend fun getFlowersAndPuja(limit: Int): Result<List<Product>> {
        simulateNetwork()
        return Result.success(
            products.filter {
                it.category == ProductCategory.FLOWERS || it.category == ProductCategory.GARLANDS || it.category == ProductCategory.PUJA_ITEMS
            }.take(limit),
        )
    }

    override suspend fun getDailyEssentials(limit: Int): Result<List<Product>> {
        simulateNetwork()
        return Result.success(
            products.filter {
                it.category == ProductCategory.GROCERY || it.category == ProductCategory.HOUSEHOLD || it.category == ProductCategory.DAIRY
            }.take(limit),
        )
    }

    private fun applyFilter(input: List<Product>, filter: ProductFilter): List<Product> {
        var list = input
        filter.minPrice?.let { min -> list = list.filter { it.price >= min } }
        filter.maxPrice?.let { max -> list = list.filter { it.price <= max } }
        filter.minRating?.let { min -> list = list.filter { it.rating >= min } }
        filter.minDiscount?.let { min -> list = list.filter { it.discountPercent >= min } }
        if (filter.inStockOnly) list = list.filter { it.inStock }
        list = when (filter.sortOption) {
            SortOption.RELEVANCE -> list
            SortOption.PRICE_LOW_TO_HIGH -> list.sortedBy { it.price }
            SortOption.PRICE_HIGH_TO_LOW -> list.sortedByDescending { it.price }
            SortOption.POPULARITY -> list.sortedByDescending { it.reviewCount }
            SortOption.NEWEST -> list.sortedByDescending { it.id }
            SortOption.DISCOUNT -> list.sortedByDescending { it.discountPercent }
        }
        return list
    }
}
