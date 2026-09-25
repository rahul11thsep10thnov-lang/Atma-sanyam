package com.wholesoul.app.data.repository

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.domain.model.ProductCategory
import kotlinx.coroutines.test.runTest
import org.junit.Test

class MockProductRepositoryTest {

    private val repository = MockProductRepository()

    @Test
    fun `searching tomato returns matching products`() = runTest {
        val results = repository.searchProducts("tomato").getOrThrow()
        assertThat(results).isNotEmpty()
        assertThat(results.all { it.name.lowercase().contains("tomato") || it.tags.any { tag -> tag.contains("tomato") } }).isTrue()
    }

    @Test
    fun `blank search query returns no results`() = runTest {
        val results = repository.searchProducts("   ").getOrThrow()
        assertThat(results).isEmpty()
    }

    @Test
    fun `search for unknown product returns empty list not error`() = runTest {
        val results = repository.searchProducts("zzz-nonexistent-item-zzz").getOrThrow()
        assertThat(results).isEmpty()
    }

    @Test
    fun `catalog meets minimum counts required per category`() = runTest {
        val all = repository.getAllProducts().getOrThrow()
        assertThat(all.count { it.category == ProductCategory.FRUITS }).isAtLeast(50)
        assertThat(all.count { it.category == ProductCategory.VEGETABLES }).isAtLeast(50)
        assertThat(all.count { it.category == ProductCategory.FLOWERS }).isAtLeast(30)
        assertThat(all.count { it.category == ProductCategory.GARLANDS }).isAtLeast(20)
        assertThat(all.count { it.category == ProductCategory.PUJA_ITEMS }).isAtLeast(30)
        assertThat(all.count { it.category == ProductCategory.GROCERY }).isAtLeast(50)
        assertThat(all.count { it.category == ProductCategory.HOUSEHOLD }).isAtLeast(30)
        assertThat(all.count { it.category == ProductCategory.PERSONAL_CARE }).isAtLeast(30)
    }

    @Test
    fun `getProductById returns failure for unknown id`() = runTest {
        val result = repository.getProductById("does-not-exist")
        assertThat(result.isFailure).isTrue()
    }
}
