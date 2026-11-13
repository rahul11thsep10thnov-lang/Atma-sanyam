package com.wholesoul.app.di

import com.wholesoul.app.data.admin.AdminPinStore
import com.wholesoul.app.data.admin.DataStoreAdminPinStore
import com.wholesoul.app.data.admin.PinAdminAccess
import com.wholesoul.app.data.catalog.CatalogChangeBus
import com.wholesoul.app.data.catalog.CatalogSeedFlag
import com.wholesoul.app.data.catalog.CatalogSeeder
import com.wholesoul.app.data.catalog.DataStoreCatalogSeedFlag
import com.wholesoul.app.data.catalog.CatalogSeeding
import com.wholesoul.app.data.local.RoomTransactionRunner
import com.wholesoul.app.data.local.TransactionRunner
import com.wholesoul.app.data.media.LocalImageStore
import com.wholesoul.app.data.repository.MockAuthRepository
import com.wholesoul.app.data.repository.RoomAdminCatalogRepository
import com.wholesoul.app.data.repository.RoomCategoryRepository
import com.wholesoul.app.data.repository.RoomProductRepository
import com.wholesoul.app.data.repository.MockCouponRepository
import com.wholesoul.app.data.repository.MockNotificationRepository
import com.wholesoul.app.data.repository.MockPaymentRepository
import com.wholesoul.app.data.repository.MockServiceabilityRepository
import com.wholesoul.app.data.repository.RoomAddressRepository
import com.wholesoul.app.data.repository.RoomCartRepository
import com.wholesoul.app.data.repository.RoomOrderRepository
import com.wholesoul.app.data.repository.RoomWishlistRepository
import com.wholesoul.app.domain.repository.AddressRepository
import com.wholesoul.app.domain.repository.AdminAccess
import com.wholesoul.app.domain.repository.AdminCatalogRepository
import com.wholesoul.app.domain.repository.CatalogChanges
import com.wholesoul.app.domain.repository.ImageStore
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
    abstract fun bindProductRepository(impl: RoomProductRepository): ProductRepository

    @Binds
    @Singleton
    abstract fun bindCategoryRepository(impl: RoomCategoryRepository): CategoryRepository

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

    // --- Admin Console / editable catalog ---

    @Binds
    @Singleton
    abstract fun bindAdminCatalogRepository(impl: RoomAdminCatalogRepository): AdminCatalogRepository

    @Binds
    @Singleton
    abstract fun bindCatalogChanges(impl: CatalogChangeBus): CatalogChanges

    @Binds
    @Singleton
    abstract fun bindCatalogSeeding(impl: CatalogSeeder): CatalogSeeding

    @Binds
    @Singleton
    abstract fun bindCatalogSeedFlag(impl: DataStoreCatalogSeedFlag): CatalogSeedFlag

    @Binds
    @Singleton
    abstract fun bindTransactionRunner(impl: RoomTransactionRunner): TransactionRunner

    @Binds
    @Singleton
    abstract fun bindImageStore(impl: LocalImageStore): ImageStore

    @Binds
    @Singleton
    abstract fun bindAdminAccess(impl: PinAdminAccess): AdminAccess

    @Binds
    @Singleton
    abstract fun bindAdminPinStore(impl: DataStoreAdminPinStore): AdminPinStore
}
