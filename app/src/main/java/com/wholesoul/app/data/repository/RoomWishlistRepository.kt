package com.wholesoul.app.data.repository

import com.wholesoul.app.data.local.dao.WishlistDao
import com.wholesoul.app.data.local.entity.WishlistEntity
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.WishlistRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomWishlistRepository @Inject constructor(
    private val wishlistDao: WishlistDao,
) : WishlistRepository {

    private val productsById by lazy { MockProductData.allProducts.associateBy { it.id } }

    override val wishlistProducts: Flow<List<Product>> = wishlistDao.observeAll().map { entities ->
        entities.mapNotNull { productsById[it.productId] }
    }

    override suspend fun add(productId: String) {
        wishlistDao.insert(WishlistEntity(productId, System.currentTimeMillis()))
    }

    override suspend fun remove(productId: String) {
        wishlistDao.delete(productId)
    }

    override suspend fun isWishlisted(productId: String): Boolean = wishlistDao.exists(productId)

    override suspend fun toggle(productId: String) {
        if (isWishlisted(productId)) remove(productId) else add(productId)
    }
}
