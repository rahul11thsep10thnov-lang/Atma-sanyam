package com.wholesoul.app.data.repository

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.catalog.DefaultCategory
import com.wholesoul.app.domain.repository.ProductFilter
import com.wholesoul.app.domain.repository.SortOption
import com.wholesoul.app.fakes.InMemoryCatalog
import com.wholesoul.app.fakes.NoopCatalogSeeding
import kotlinx.coroutines.test.runTest
import org.junit.Test

class RoomProductRepositoryTest {

    private val catalog = InMemoryCatalog()
    private val repository = RoomProductRepository(catalog.productDao, catalog.categoryDao, NoopCatalogSeeding())

    @Test
    fun `starter catalog meets the minimum counts required per category`() = runTest {
        catalog.seedStarterCatalog()
        val all = repository.getAllProducts().getOrThrow()
        fun count(category: DefaultCategory) = all.count { it.categoryId == category.id }
        assertThat(count(DefaultCategory.FRUITS)).isAtLeast(50)
        assertThat(count(DefaultCategory.VEGETABLES)).isAtLeast(50)
        assertThat(count(DefaultCategory.FLOWERS)).isAtLeast(30)
        assertThat(count(DefaultCategory.GARLANDS)).isAtLeast(20)
        assertThat(count(DefaultCategory.PUJA_ITEMS)).isAtLeast(30)
        assertThat(count(DefaultCategory.GROCERY)).isAtLeast(50)
        assertThat(count(DefaultCategory.HOUSEHOLD)).isAtLeast(30)
        assertThat(count(DefaultCategory.PERSONAL_CARE)).isAtLeast(30)
        assertThat(all.size).isAtLeast(360)
    }

    @Test
    fun `searching matches name and tags`() = runTest {
        catalog.seedStarterCatalog()
        val results = repository.searchProducts("tomato").getOrThrow()
        assertThat(results).isNotEmpty()
        assertThat(results.all { p -> p.name.lowercase().contains("tomato") || p.tags.any { it.contains("tomato") } }).isTrue()
    }

    @Test
    fun `blank and unknown searches return an empty list not an error`() = runTest {
        catalog.seedStarterCatalog()
        assertThat(repository.searchProducts("   ").getOrThrow()).isEmpty()
        assertThat(repository.searchProducts("zzz-nonexistent-item-zzz").getOrThrow()).isEmpty()
    }

    @Test
    fun `customers never see hidden items`() = runTest {
        catalog.addCategory("sweets")
        catalog.addProduct("laddu", "sweets")
        catalog.addProduct("barfi", "sweets", isActive = false)

        assertThat(repository.getProductsByCategory("sweets").getOrThrow().map { it.id }).containsExactly("laddu")
        assertThat(repository.getAllProducts().getOrThrow().map { it.id }).containsExactly("laddu")
        assertThat(repository.searchProducts("barfi").getOrThrow()).isEmpty()
        assertThat(repository.getProductById("barfi").isFailure).isTrue()
        assertThat(repository.getProductById("laddu").isSuccess).isTrue()
    }

    @Test
    fun `hiding a category hides all of its items`() = runTest {
        catalog.addCategory("sweets", isActive = false)
        catalog.addProduct("laddu", "sweets")

        assertThat(repository.getProductsByCategory("sweets").getOrThrow()).isEmpty()
        assertThat(repository.getAllProducts().getOrThrow()).isEmpty()
        assertThat(repository.getProductById("laddu").isFailure).isTrue()
    }

    @Test
    fun `items come back in the sequence the admin set`() = runTest {
        catalog.addCategory("sweets")
        catalog.addProduct("c", "sweets", name = "Apple", sortOrder = 2)
        catalog.addProduct("a", "sweets", name = "Zebra", sortOrder = 0)
        catalog.addProduct("b", "sweets", name = "Mango", sortOrder = 1)

        assertThat(repository.getProductsByCategory("sweets").getOrThrow().map { it.id }).containsExactly("a", "b", "c").inOrder()
    }

    @Test
    fun `filters and sorting apply on top of the admin sequence`() = runTest {
        catalog.addCategory("sweets")
        catalog.addProduct("cheap", "sweets", price = 10.0, mrp = 10.0)
        catalog.addProduct("dear", "sweets", price = 90.0, mrp = 100.0)
        catalog.addProduct("gone", "sweets", price = 50.0, mrp = 60.0, stock = 0)

        val sorted = repository.getProductsByCategory("sweets", ProductFilter(sortOption = SortOption.PRICE_HIGH_TO_LOW)).getOrThrow()
        assertThat(sorted.map { it.id }).containsExactly("dear", "gone", "cheap").inOrder()

        val inStock = repository.getProductsByCategory("sweets", ProductFilter(inStockOnly = true)).getOrThrow()
        assertThat(inStock.map { it.id }).containsExactly("cheap", "dear")
    }

    @Test
    fun `related products stay in the same category and exclude the item itself`() = runTest {
        catalog.addCategory("sweets")
        catalog.addCategory("snacks")
        catalog.addProduct("a", "sweets")
        catalog.addProduct("b", "sweets")
        catalog.addProduct("c", "snacks")

        val a = repository.getProductById("a").getOrThrow()
        assertThat(repository.getRelatedProducts(a).getOrThrow().map { it.id }).containsExactly("b")
    }
}
