package com.wholesoul.app.data.repository

import com.wholesoul.app.data.catalog.CatalogSeeding
import com.wholesoul.app.data.catalog.DefaultCategory
import com.wholesoul.app.data.catalog.catalogCall
import com.wholesoul.app.data.local.dao.CategoryDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.ProductFilter
import com.wholesoul.app.domain.repository.ProductRepository
import com.wholesoul.app.domain.repository.SortOption
import javax.inject.Inject
import javax.inject.Singleton

/**
 * What customers see: only products that are switched on and sit in a category that is switched
 * on, in the sequence the shop owner set in the Admin Console.
 */
@Singleton
class RoomProductRepository @Inject constructor(
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao,
    private val seeding: CatalogSeeding,
) : ProductRepository {

    override suspend fun getAllProducts(): Result<List<Product>> = catalogCall(seeding) {
        productDao.getVisible().map { it.toDomain() }
    }

    override suspend fun getProductById(id: String): Result<Product> = catalogCall(seeding) {
        val entity = productDao.getById(id)
        val category = entity?.let { categoryDao.getById(it.categoryId) }
        if (entity == null || !entity.isActive || category?.isActive != true) {
            throw NoSuchElementException("Product unavailable")
        }
        entity.toDomain()
    }

    override suspend fun getProductsByCategory(categoryId: String, filter: ProductFilter): Result<List<Product>> =
        catalogCall(seeding) {
            applyFilter(productDao.getVisibleInCategory(categoryId).map { it.toDomain() }, filter)
        }

    override suspend fun getRelatedProducts(product: Product, limit: Int): Result<List<Product>> = catalogCall(seeding) {
        productDao.getVisibleInCategory(product.categoryId)
            .map { it.toDomain() }
            .filter { it.id != product.id }
            .take(limit)
    }

    override suspend fun searchProducts(query: String): Result<List<Product>> = catalogCall(seeding) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return@catalogCall emptyList()
        val categoryNames = categoryDao.getAll().associate { it.id to it.name.lowercase() }
        productDao.getVisible().map { it.toDomain() }.filter { product ->
            product.name.lowercase().contains(q) ||
                product.tags.any { it.lowercase().contains(q) } ||
                categoryNames[product.categoryId]?.contains(q) == true
        }
    }

    override suspend fun getFreshToday(limit: Int): Result<List<Product>> = catalogCall(seeding) {
        inCategories(DefaultCategory.FRUITS.id, DefaultCategory.VEGETABLES.id)
            .sortedBy { it.freshnessInfo?.harvestedDaysAgo ?: 0 }
            .take(limit)
    }

    override suspend fun getBestPrices(limit: Int): Result<List<Product>> = catalogCall(seeding) {
        productDao.getVisible().map { it.toDomain() }
            .filter { it.discountPercent >= 16 }
            .sortedByDescending { it.discountPercent }
            .take(limit)
    }

    override suspend fun getPopular(limit: Int): Result<List<Product>> = catalogCall(seeding) {
        productDao.getVisible().map { it.toDomain() }
            .sortedByDescending { it.reviewCount * it.rating }
            .take(limit)
    }

    override suspend fun getFlowersAndPuja(limit: Int): Result<List<Product>> = catalogCall(seeding) {
        inCategories(DefaultCategory.FLOWERS.id, DefaultCategory.GARLANDS.id, DefaultCategory.PUJA_ITEMS.id).take(limit)
    }

    override suspend fun getDailyEssentials(limit: Int): Result<List<Product>> = catalogCall(seeding) {
        inCategories(DefaultCategory.GROCERY.id, DefaultCategory.HOUSEHOLD.id, DefaultCategory.DAIRY.id).take(limit)
    }

    private suspend fun inCategories(vararg categoryIds: String): List<Product> =
        categoryIds.flatMap { productDao.getVisibleInCategory(it) }.map { it.toDomain() }

    private fun applyFilter(input: List<Product>, filter: ProductFilter): List<Product> {
        var list = input
        filter.minPrice?.let { min -> list = list.filter { it.price >= min } }
        filter.maxPrice?.let { max -> list = list.filter { it.price <= max } }
        filter.minRating?.let { min -> list = list.filter { it.rating >= min } }
        filter.minDiscount?.let { min -> list = list.filter { it.discountPercent >= min } }
        if (filter.inStockOnly) list = list.filter { it.inStock }
        return when (filter.sortOption) {
            SortOption.RELEVANCE -> list
            SortOption.PRICE_LOW_TO_HIGH -> list.sortedBy { it.price }
            SortOption.PRICE_HIGH_TO_LOW -> list.sortedByDescending { it.price }
            SortOption.POPULARITY -> list.sortedByDescending { it.reviewCount }
            SortOption.NEWEST -> list.sortedByDescending { it.createdAtEpochMillis }
            SortOption.DISCOUNT -> list.sortedByDescending { it.discountPercent }
        }
    }
}
