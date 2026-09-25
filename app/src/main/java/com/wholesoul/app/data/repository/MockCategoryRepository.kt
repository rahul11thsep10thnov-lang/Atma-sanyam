package com.wholesoul.app.data.repository

import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.data.mock.MockCategoryData
import com.wholesoul.app.domain.model.Banner
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.repository.CategoryRepository
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockCategoryRepository @Inject constructor() : CategoryRepository {
    override suspend fun getCategories(): Result<List<Category>> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        return Result.success(MockCategoryData.categories)
    }

    override suspend fun getBanners(): Result<List<Banner>> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        return Result.success(MockCategoryData.banners)
    }
}
