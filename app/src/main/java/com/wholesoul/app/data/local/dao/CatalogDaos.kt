package com.wholesoul.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.wholesoul.app.data.local.entity.CategoryCount
import com.wholesoul.app.data.local.entity.CategoryEntity
import com.wholesoul.app.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

/**
 * "Visible" below means the product is switched on AND its category is switched on. The
 * customer app only ever reads visible products; the Admin Console reads everything.
 */
@Dao
interface ProductDao {

    @Query(
        "SELECT p.* FROM products AS p LEFT JOIN categories AS c ON c.id = p.categoryId " +
            "ORDER BY IFNULL(c.sortOrder, 2147483647), p.categoryId, p.sortOrder, p.name",
    )
    fun observeAll(): Flow<List<ProductEntity>>

    @Query(
        "SELECT p.* FROM products AS p INNER JOIN categories AS c ON c.id = p.categoryId " +
            "WHERE p.isActive = 1 AND c.isActive = 1 " +
            "ORDER BY c.sortOrder, p.categoryId, p.sortOrder, p.name",
    )
    suspend fun getVisible(): List<ProductEntity>

    @Query(
        "SELECT p.* FROM products AS p INNER JOIN categories AS c ON c.id = p.categoryId " +
            "WHERE p.categoryId = :categoryId AND p.isActive = 1 AND c.isActive = 1 " +
            "ORDER BY p.sortOrder, p.name",
    )
    suspend fun getVisibleInCategory(categoryId: String): List<ProductEntity>

    @Query(
        "SELECT p.* FROM products AS p INNER JOIN categories AS c ON c.id = p.categoryId " +
            "WHERE p.id IN (:ids) AND p.isActive = 1 AND c.isActive = 1",
    )
    fun observeVisibleByIds(ids: List<String>): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE categoryId = :categoryId ORDER BY sortOrder, name")
    suspend fun getAllInCategory(categoryId: String): List<ProductEntity>

    @Query("SELECT * FROM products WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ProductEntity?

    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int

    @Query("SELECT COUNT(*) FROM products WHERE categoryId = :categoryId")
    suspend fun countInCategory(categoryId: String): Int

    @Query("SELECT MAX(sortOrder) FROM products WHERE categoryId = :categoryId")
    suspend fun maxSortOrder(categoryId: String): Int?

    @Query(
        "SELECT categoryId, COUNT(*) AS total, " +
            "SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) AS visible " +
            "FROM products GROUP BY categoryId",
    )
    fun observeCategoryCounts(): Flow<List<CategoryCount>>

    @Query(
        "SELECT categoryId, COUNT(*) AS total, " +
            "SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) AS visible " +
            "FROM products GROUP BY categoryId",
    )
    suspend fun getCategoryCounts(): List<CategoryCount>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(products: List<ProductEntity>)

    @Query("DELETE FROM products WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<String>)

    @Query("UPDATE products SET isActive = :active WHERE id IN (:ids)")
    suspend fun setActive(ids: List<String>, active: Boolean)

    @Query("UPDATE products SET stock = :stock WHERE id = :id")
    suspend fun setStock(id: String, stock: Int)

    @Query("UPDATE products SET stock = MAX(stock - :quantity, 0) WHERE id = :id")
    suspend fun decreaseStock(id: String, quantity: Int)

    @Query("UPDATE products SET stock = stock + :quantity WHERE id = :id")
    suspend fun increaseStock(id: String, quantity: Int)

    @Query("UPDATE products SET sortOrder = :sortOrder WHERE id = :id")
    suspend fun setSortOrder(id: String, sortOrder: Int)

    @Query("UPDATE products SET categoryId = :categoryId, sortOrder = :sortOrder WHERE id = :id")
    suspend fun moveToCategory(id: String, categoryId: String, sortOrder: Int)
}

@Dao
interface CategoryDao {

    @Query("SELECT * FROM categories ORDER BY sortOrder, name")
    fun observeAll(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories ORDER BY sortOrder, name")
    suspend fun getAll(): List<CategoryEntity>

    @Query("SELECT * FROM categories WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): CategoryEntity?

    @Query("SELECT COUNT(*) FROM categories")
    suspend fun count(): Int

    @Query("SELECT MAX(sortOrder) FROM categories")
    suspend fun maxSortOrder(): Int?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE categories SET sortOrder = :sortOrder WHERE id = :id")
    suspend fun setSortOrder(id: String, sortOrder: Int)
}
