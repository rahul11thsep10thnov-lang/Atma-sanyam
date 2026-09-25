package com.wholesoul.app.di

import com.wholesoul.app.data.repository.MockAuthRepository
import com.wholesoul.app.data.repository.MockCategoryRepository
import com.wholesoul.app.data.repository.MockCouponRepository
import com.wholesoul.app.data.repository.MockNotificationRepository
import com.wholesoul.app.data.repository.MockPaymentRepository
import com.wholesoul.app.data.repository.MockProductRepository
import com.wholesoul.app.data.repository.MockServiceabilityRepository
import com.wholesoul.app.data.repository.RoomAddressRepository
import com.wholesoul.app.data.repository.RoomCartRepository
import com.wholesoul.app.data.repository.RoomOrderRepository
import com.wholesoul.app.data.repository.RoomWishlistRepository
import com.wholesoul.app.domain.repository.AddressRepository
import com.wholesoul.app.domain.repository.AuthRepository
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.CategoryRepository
import com.wholesoul.app.domain.repository.CouponRepository
import com.wholesoul.app.domain.repository.NotificationRepository
import com.wholesoul.app.domain.repository.OrderRepository
import com.wholesoul.app.domain.repository.PaymentRepository
import com.wholesoul.app.domain.repository.ProductRepository
import com.wholesoul.app.domain.repository.ServiceabilityRepository
import com.wholesoul.app.domain.repository.WishlistRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Every binding below points at Development Mode's mock/local implementation
 * (spec section 39). To connect a real backend, replace the implementation type on the
 * right of a single [Binds] — the interface, and every ViewModel/screen using it, stays
 * unchanged.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: MockAuthRepository): AuthRepository

    @Binds
    @Singleton
    abstract fun bindProductRepository(impl: MockProductRepository): ProductRepository

    @Binds
    @Singleton
    abstract fun bindCategoryRepository(impl: MockCategoryRepository): CategoryRepository

    @Binds
    @Singleton
    abstract fun bindCartRepository(impl: RoomCartRepository): CartRepository

    @Binds
    @Singleton
    abstract fun bindAddressRepository(impl: RoomAddressRepository): AddressRepository

    @Binds
    @Singleton
    abstract fun bindOrderRepository(impl: RoomOrderRepository): OrderRepository

    @Binds
    @Singleton
    abstract fun bindWishlistRepository(impl: RoomWishlistRepository): WishlistRepository

    @Binds
    @Singleton
    abstract fun bindCouponRepository(impl: MockCouponRepository): CouponRepository

    @Binds
    @Singleton
    abstract fun bindNotificationRepository(impl: MockNotificationRepository): NotificationRepository

    @Binds
    @Singleton
    abstract fun bindPaymentRepository(impl: MockPaymentRepository): PaymentRepository

    @Binds
    @Singleton
    abstract fun bindServiceabilityRepository(impl: MockServiceabilityRepository): ServiceabilityRepository
}
