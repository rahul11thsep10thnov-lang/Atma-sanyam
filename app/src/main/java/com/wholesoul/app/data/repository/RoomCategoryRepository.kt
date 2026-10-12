package com.wholesoul.app.data.repository

import com.wholesoul.app.data.catalog.CatalogSeeding
import com.wholesoul.app.data.catalog.catalogCall
import com.wholesoul.app.data.local.dao.CategoryDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.data.mock.MockCategoryData
import com.wholesoul.app.domain.model.Banner
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.repository.CategoryRepository
import javax.inject.Inject
import javax.inject.Singleton

/** What customers see: visible categories that actually have something to buy. */
@Singleton
class RoomCategoryRepository @Inject constructor(
    private val categoryDao: CategoryDao,
    private val productDao: ProductDao,
    private val seeding: CatalogSeeding,
) : CategoryRepository {

    override suspend fun getCategories(): Result<List<Category>> = catalogCall(seeding) {
        visibleCategories()
    }

    override suspend fun getCategory(id: String): Result<Category> = catalogCall(seeding) {
        val entity = categoryDao.getById(id)
        if (entity == null || !entity.isActive) throw NoSuchElementException("Category unavailable")
        val visible = productDao.getCategoryCounts().firstOrNull { it.categoryId == id }?.visible ?: 0
        entity.toDomain(productCount = visible)
    }

    override suspend fun getBanners(): Result<List<Banner>> = catalogCall(seeding) {
        val shown = visibleCategories().map { it.id }.toSet()
        MockCategoryData.banners.filter { it.deepLinkCategoryId == null || it.deepLinkCategoryId in shown }
    }

    private suspend fun visibleCategories(): List<Category> {
        val visibleCounts = productDao.getCategoryCounts().associate { it.categoryId to it.visible }
        return categoryDao.getAll()
            .filter { it.isActive }
            .mapNotNull { entity ->
                val visible = visibleCounts[entity.id] ?: 0
                if (visible > 0) entity.toDomain(productCount = visible) else null
            }
    }
}
