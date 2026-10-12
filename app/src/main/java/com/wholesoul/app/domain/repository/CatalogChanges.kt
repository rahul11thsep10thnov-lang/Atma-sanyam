package com.wholesoul.app.domain.repository

import kotlinx.coroutines.flow.Flow

/**
 * Fires whenever the catalog (products, categories, stock) is modified, so screens that
 * loaded a snapshot — Home, Categories, listings, details, search — can refresh themselves
 * after an Admin Console edit or after an order changes stock.
 */
interface CatalogChanges {
    val events: Flow<Unit>
    fun notifyChanged()
}
