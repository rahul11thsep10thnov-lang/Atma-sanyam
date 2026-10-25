package com.wholesoul.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.wholesoul.app.data.local.dao.AddressDao
import com.wholesoul.app.data.local.dao.CartDao
import com.wholesoul.app.data.local.dao.OrderDao
import com.wholesoul.app.data.local.dao.WishlistDao
import com.wholesoul.app.data.local.entity.AddressEntity
import com.wholesoul.app.data.local.entity.CartItemEntity
import com.wholesoul.app.data.local.entity.CartMetaEntity
import com.wholesoul.app.data.local.entity.OrderEntity
import com.wholesoul.app.data.local.entity.WishlistEntity

@Database(
    entities = [
        AddressEntity::class,
        CartItemEntity::class,
        CartMetaEntity::class,
        WishlistEntity::class,
        OrderEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class WholesoulDatabase : RoomDatabase() {
    abstract fun addressDao(): AddressDao
    abstract fun cartDao(): CartDao
    abstract fun wishlistDao(): WishlistDao
    abstract fun orderDao(): OrderDao

    companion object {
        const val DATABASE_NAME = "wholesoul.db"
    }
}
