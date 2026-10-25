package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.Product
import kotlinx.coroutines.flow.Flow

enum class MoveDirection { UP, DOWN }

/**
 * Everything the Admin Console can do to the catalog. Unlike [ProductRepository] and
 * [CategoryRepository] (what customers see), this includes hidden items and hidden categories.
 */
interface AdminCatalogRepository {
    /** All categories in sequence, hidden ones included, with their total item counts. */
    fun observeCategories(): Flow<List<Category>>

    /** All products, hidden ones included, ordered by category sequence then item sequence. */
    fun observeProducts(): Flow<List<Product>>

    suspend fun getProduct(id: String): Product?
    suspend fun getCategory(id: String): Category?

    /** Inserts when [category]'s id is new (appended last), otherwise updates. */
    suspend fun saveCategory(category: Category): Result<Unit>

    /** Refused while the category still has items, so nothing is orphaned. */
    suspend fun deleteCategory(id: String): Result<Unit>

    suspend fun moveCategory(id: String, direction: MoveDirection): Result<Unit>

    /**
     * Inserts when [product]'s id is new (appended last in its category), otherwise updates.
     * Moving a product to another category appends it last there.
     */
    suspend fun saveProduct(product: Product): Result<Unit>

    /** Swaps the product with its neighbour inside the same category. */
    suspend fun moveProduct(id: String, direction: MoveDirection): Result<Unit>

    suspend fun deleteProducts(ids: Set<String>): Result<Unit>
    suspend fun setProductsActive(ids: Set<String>, active: Boolean): Result<Unit>
    suspend fun moveProductsToCategory(ids: Set<String>, categoryId: String): Result<Unit>
    suspend fun setStock(id: String, stock: Int): Result<Unit>
}
