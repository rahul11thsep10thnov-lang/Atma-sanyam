package com.wholesoul.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.wholesoul.app.data.local.dao.CategoryDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.entity.CategoryEntity
import com.wholesoul.app.data.local.entity.ProductEntity

/**
 * The editable product catalog. Kept in its own database file, separate from the customer's
 * cart/orders/addresses, because the catalog is owned by the shop (and will eventually come
 * from a server) while the other data belongs to the customer on this phone.
 */
@Database(
    entities = [ProductEntity::class, CategoryEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class CatalogDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao

    companion object {
        const val DATABASE_NAME = "wholesoul_catalog.db"
    }
}
