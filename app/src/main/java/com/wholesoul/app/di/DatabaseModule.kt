package com.wholesoul.app.di

import android.content.Context
import androidx.room.Room
import com.wholesoul.app.data.local.WholesoulDatabase
import com.wholesoul.app.data.local.dao.AddressDao
import com.wholesoul.app.data.local.dao.CartDao
import com.wholesoul.app.data.local.dao.OrderDao
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
}
