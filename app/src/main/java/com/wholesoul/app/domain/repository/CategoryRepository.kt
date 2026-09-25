package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Banner
import com.wholesoul.app.domain.model.Category

interface CategoryRepository {
    suspend fun getCategories(): Result<List<Category>>
    suspend fun getBanners(): Result<List<Banner>>
}
