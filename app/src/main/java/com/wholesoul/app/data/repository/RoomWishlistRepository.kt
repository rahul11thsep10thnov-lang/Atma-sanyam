package com.wholesoul.app.data.repository

import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.dao.WishlistDao
import com.wholesoul.app.data.local.entity.WishlistEntity
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.WishlistRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomWishlistRepository @Inject constructor(
    private val wishlistDao: WishlistDao,
    private val productDao: ProductDao,
) : WishlistRepository {

    @OptIn(ExperimentalCoroutinesApi::class)
    override val wishlistProducts: Flow<List<Product>> = wishlistDao.observeAll().flatMapLatest { saved ->
        if (saved.isEmpty()) {
            flowOf(emptyList())
        } else {
            productDao.observeVisibleByIds(saved.map { it.productId }).map { entities ->
                val byId = entities.associateBy { it.id }
                saved.mapNotNull { byId[it.productId]?.toDomain() }
            }
        }
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
