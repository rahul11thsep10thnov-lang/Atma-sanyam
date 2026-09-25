package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Product
import kotlinx.coroutines.flow.Flow

interface WishlistRepository {
    val wishlistProducts: Flow<List<Product>>

    suspend fun add(productId: String)
    suspend fun remove(productId: String)
    suspend fun isWishlisted(productId: String): Boolean
    suspend fun toggle(productId: String)
}
