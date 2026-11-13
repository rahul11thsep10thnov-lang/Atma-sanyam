package com.wholesoul.app.data.catalog

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.wholesoul.app.data.local.SessionPreferenceKeys
import com.wholesoul.app.data.local.TransactionRunner
import com.wholesoul.app.data.local.dao.CategoryDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.entity.CategoryEntity
import com.wholesoul.app.data.local.entity.ProductEntity
import com.wholesoul.app.data.local.entity.toEntity
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.domain.repository.CatalogChanges
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/** Makes sure the catalog database has its starter content before anyone reads it. */
interface CatalogSeeding {
    suspend fun ensureSeeded()
}

/** Remembers across app launches that the starter catalog has already been copied in. */
interface CatalogSeedFlag {
    suspend fun isSeeded(): Boolean
    suspend fun markSeeded()
}

@Singleton
class DataStoreCatalogSeedFlag @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) : CatalogSeedFlag {
    override suspend fun isSeeded(): Boolean = dataStore.data.first()[SessionPreferenceKeys.CATALOG_SEEDED] ?: false

    override suspend fun markSeeded() {
        dataStore.edit { it[SessionPreferenceKeys.CATALOG_SEEDED] = true }
    }
}

/**
 * Copies the starter catalog (12 categories, 360 demo products) into the catalog database
 * exactly once per install. A flag is remembered so that if the shop owner later deletes
 * everything, the demo data does not come back.
 */
@Singleton
class CatalogSeeder @Inject constructor(
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao,
    private val transactions: TransactionRunner,
    private val seedFlag: CatalogSeedFlag,
    private val changes: CatalogChanges,
) : CatalogSeeding {

    private val mutex = Mutex()

    @Volatile
    private var done = false

    override suspend fun ensureSeeded() {
        if (done) return
        mutex.withLock {
            if (done) return@withLock
            val alreadySeeded = seedFlag.isSeeded()
            if (!alreadySeeded) {
                if (productDao.count() == 0 && categoryDao.count() == 0) {
                    transactions.run {
                        categoryDao.upsertAll(starterCategories())
                        productDao.upsertAll(starterProducts())
                    }
                    changes.notifyChanged()
                }
                seedFlag.markSeeded()
            }
            done = true
        }
    }

    private fun starterCategories(): List<CategoryEntity> =
        DefaultCategory.entries.mapIndexed { index, category ->
            CategoryEntity(
                id = category.id,
                name = category.displayName,
                imageKey = "categories/${category.id}",
                sortOrder = index,
                isActive = true,
            )
        }

    private fun starterProducts(): List<ProductEntity> =
        MockProductData.allProducts
            .groupBy { it.categoryId }
            .flatMap { (_, items) -> items.mapIndexed { index, product -> product.copy(sortOrder = index).toEntity() } }
}
