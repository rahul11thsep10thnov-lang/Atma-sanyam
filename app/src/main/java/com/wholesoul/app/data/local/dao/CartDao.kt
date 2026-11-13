package com.wholesoul.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.wholesoul.app.data.local.entity.CartItemEntity
import com.wholesoul.app.data.local.entity.CartMetaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CartDao {
    @Query("SELECT * FROM cart_items")
    fun observeItems(): Flow<List<CartItemEntity>>

    @Query("SELECT * FROM cart_items WHERE productId = :productId LIMIT 1")
    suspend fun getItem(productId: String): CartItemEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: CartItemEntity)

    @Query("DELETE FROM cart_items WHERE productId = :productId")
    suspend fun delete(productId: String)

    @Query("DELETE FROM cart_items")
    suspend fun clear()

    @Query("SELECT * FROM cart_meta WHERE id = 0 LIMIT 1")
    fun observeMeta(): Flow<CartMetaEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMeta(meta: CartMetaEntity)
}
