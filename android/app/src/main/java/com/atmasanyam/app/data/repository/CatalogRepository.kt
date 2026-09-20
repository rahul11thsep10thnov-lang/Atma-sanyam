package com.atmasanyam.app.data.repository

import com.atmasanyam.app.data.remote.ApiService
import com.atmasanyam.app.domain.model.Category
import com.atmasanyam.app.domain.model.IndianState
import com.atmasanyam.app.domain.model.Language
import javax.inject.Inject
import javax.inject.Singleton

/** Languages, categories and India state/district reference data (spec §6/§18/§21). */
@Singleton
class CatalogRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getLanguages(): List<Language> =
        api.getLanguages().languages.map { Language(it.code, it.englishName, it.nativeName) }

    suspend fun getCategories(): List<Category> =
        api.getCategories().categories.map { Category(it.key, it.label) }

    suspend fun getStates(): List<IndianState> =
        api.getStates().states.map { IndianState(it.name, it.isUnionTerritory) }

    suspend fun getDistricts(state: String): List<String> = api.getDistricts(state).districts
}
