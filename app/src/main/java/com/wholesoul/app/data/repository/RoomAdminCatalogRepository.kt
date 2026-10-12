package com.wholesoul.app.data.repository

import com.wholesoul.app.data.catalog.CatalogSeeding
import com.wholesoul.app.data.catalog.catalogResult
import com.wholesoul.app.data.local.TransactionRunner
import com.wholesoul.app.data.local.dao.CategoryDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.entity.CategoryEntity
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.data.local.entity.toEntity
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.AdminCatalogRepository
import com.wholesoul.app.domain.repository.CatalogChanges
import com.wholesoul.app.domain.repository.MoveDirection
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import javax.inject.Inject
import javax.inject.Singleton

/** SQLite caps how many `?` a statement may have, so bulk operations go in slices. */
private const val BULK_SLICE = 500

@Singleton
class RoomAdminCatalogRepository @Inject constructor(
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao,
    private val transactions: TransactionRunner,
    private val changes: CatalogChanges,
    private val seeding: CatalogSeeding,
) : AdminCatalogRepository {

    override fun observeCategories(): Flow<List<Category>> =
        combine(categoryDao.observeAll(), productDao.observeCategoryCounts()) { categories, counts ->
            val totals = counts.associate { it.categoryId to it.total }
            categories.map { it.toDomain(productCount = totals[it.id] ?: 0) }
        }.onStart { seeding.ensureSeeded() }

    override fun observeProducts(): Flow<List<Product>> =
        productDao.observeAll()
            .map { list -> list.map { it.toDomain() } }
            .onStart { seeding.ensureSeeded() }

    override suspend fun getProduct(id: String): Product? {
        seeding.ensureSeeded()
        return productDao.getById(id)?.toDomain()
    }

    override suspend fun getCategory(id: String): Category? {
        seeding.ensureSeeded()
        return categoryDao.getById(id)?.toDomain(productCount = productDao.countInCategory(id))
    }

    override suspend fun saveCategory(category: Category): Result<Unit> = write {
        val name = category.displayName.trim()
        require(name.isNotEmpty()) { "Category name can't be empty" }
        val clash = categoryDao.getAll().any { it.id != category.id && it.name.trim().equals(name, ignoreCase = true) }
        require(!clash) { "A category named \"$name\" already exists" }
        val existing = categoryDao.getById(category.id)
        val sortOrder = existing?.sortOrder ?: ((categoryDao.maxSortOrder() ?: -1) + 1)
        categoryDao.upsert(CategoryEntity(category.id, name, category.imageKey, sortOrder, category.isActive))
    }

    override suspend fun deleteCategory(id: String): Result<Unit> = write {
        val count = productDao.countInCategory(id)
        if (count > 0) {
            val name = categoryDao.getById(id)?.name ?: "This category"
            val items = if (count == 1) "1 item" else "$count items"
            throw IllegalStateException("\"$name\" still has $items. Move or delete them first.")
        }
        categoryDao.delete(id)
    }

    override suspend fun moveCategory(id: String, direction: MoveDirection): Result<Unit> = write {
        val ordered = categoryDao.getAll()
        val index = ordered.indexOfFirst { it.id == id }
        val target = neighbour(index, direction)
        if (index < 0 || target !in ordered.indices) return@write
        val reordered = ordered.toMutableList().also {
            it[index] = ordered[target]
            it[target] = ordered[index]
        }
        reordered.forEachIndexed { position, entity ->
            if (entity.sortOrder != position) categoryDao.setSortOrder(entity.id, position)
        }
    }

    override suspend fun saveProduct(product: Product): Result<Unit> = write {
        val name = product.name.trim()
        require(name.isNotEmpty()) { "Item name can't be empty" }
        require(categoryDao.getById(product.categoryId) != null) { "Choose a category for this item" }
        require(product.price > 0) { "Selling price must be more than 0" }
        require(product.mrp >= product.price) { "Selling price can't be higher than the listed price" }
        require(product.stock >= 0) { "Quantity can't be negative" }
        val existing = productDao.getById(product.id)
        val sortOrder = if (existing != null && existing.categoryId == product.categoryId) {
            existing.sortOrder
        } else {
            (productDao.maxSortOrder(product.categoryId) ?: -1) + 1
        }
        productDao.upsert(
            product.copy(
                name = name,
                sortOrder = sortOrder,
                createdAtEpochMillis = existing?.createdAtEpochMillis ?: product.createdAtEpochMillis,
            ).toEntity(),
        )
    }

    override suspend fun moveProduct(id: String, direction: MoveDirection): Result<Unit> = write {
        val entity = productDao.getById(id) ?: return@write
        val ordered = productDao.getAllInCategory(entity.categoryId)
        val index = ordered.indexOfFirst { it.id == id }
        val target = neighbour(index, direction)
        if (index < 0 || target !in ordered.indices) return@write
        val reordered = ordered.toMutableList().also {
            it[index] = ordered[target]
            it[target] = ordered[index]
        }
        reordered.forEachIndexed { position, item ->
            if (item.sortOrder != position) productDao.setSortOrder(item.id, position)
        }
    }

    override suspend fun deleteProducts(ids: Set<String>): Result<Unit> = write {
        ids.chunked(BULK_SLICE).forEach { productDao.deleteByIds(it) }
    }

    override suspend fun setProductsActive(ids: Set<String>, active: Boolean): Result<Unit> = write {
        ids.chunked(BULK_SLICE).forEach { productDao.setActive(it, active) }
    }

    override suspend fun moveProductsToCategory(ids: Set<String>, categoryId: String): Result<Unit> = write {
        require(categoryDao.getById(categoryId) != null) { "Choose a category" }
        var next = (productDao.maxSortOrder(categoryId) ?: -1) + 1
        ids.mapNotNull { productDao.getById(it) }
            .filter { it.categoryId != categoryId }
            .sortedBy { it.sortOrder }
            .forEach { productDao.moveToCategory(it.id, categoryId, next++) }
    }

    override suspend fun setStock(id: String, stock: Int): Result<Unit> = write {
        productDao.setStock(id, stock.coerceAtLeast(0))
    }

    private fun neighbour(index: Int, direction: MoveDirection): Int =
        if (direction == MoveDirection.UP) index - 1 else index + 1

    /** One all-or-nothing catalog write; screens showing the catalog are told to refresh. */
    private suspend fun write(block: suspend () -> Unit): Result<Unit> {
        seeding.ensureSeeded()
        val result = catalogResult { transactions.run(block) }
        if (result.isSuccess) changes.notifyChanged()
        return result
    }
}
