package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Banner
import com.wholesoul.app.domain.model.Category

interface CategoryRepository {
    /** Visible categories that have at least one visible product, in the admin's sequence. */
    suspend fun getCategories(): Result<List<Category>>
    suspend fun getCategory(id: String): Result<Category>
    suspend fun getBanners(): Result<List<Banner>>
}
