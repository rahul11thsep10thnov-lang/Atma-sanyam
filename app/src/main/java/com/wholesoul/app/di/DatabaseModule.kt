package com.wholesoul.app.di

import android.content.Context
import androidx.room.Room
import com.wholesoul.app.data.local.CatalogDatabase
import com.wholesoul.app.data.local.WholesoulDatabase
import com.wholesoul.app.data.local.dao.AddressDao
import com.wholesoul.app.data.local.dao.CartDao
import com.wholesoul.app.data.local.dao.CategoryDao
import com.wholesoul.app.data.local.dao.OrderDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.dao.WishlistDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): WholesoulDatabase =
        Room.databaseBuilder(context, WholesoulDatabase::class.java, WholesoulDatabase.DATABASE_NAME)
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideAddressDao(db: WholesoulDatabase): AddressDao = db.addressDao()

    @Provides
    fun provideCartDao(db: WholesoulDatabase): CartDao = db.cartDao()

    @Provides
    fun provideWishlistDao(db: WholesoulDatabase): WishlistDao = db.wishlistDao()

    @Provides
    fun provideOrderDao(db: WholesoulDatabase): OrderDao = db.orderDao()

    @Provides
    @Singleton
    fun provideCatalogDatabase(@ApplicationContext context: Context): CatalogDatabase =
        Room.databaseBuilder(context, CatalogDatabase::class.java, CatalogDatabase.DATABASE_NAME).build()

    @Provides
    fun provideProductDao(db: CatalogDatabase): ProductDao = db.productDao()

    @Provides
    fun provideCategoryDao(db: CatalogDatabase): CategoryDao = db.categoryDao()
}
