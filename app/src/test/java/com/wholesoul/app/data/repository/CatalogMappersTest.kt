package com.wholesoul.app.data.repository

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.data.local.entity.toEntity
import com.wholesoul.app.data.mock.MockProductData
import org.junit.Test

/** What goes into the catalog database must come back out unchanged. */
class CatalogMappersTest {

    @Test
    fun `every starter product survives the round trip`() {
        MockProductData.allProducts.forEach { product ->
            assertThat(product.toEntity().toDomain()).isEqualTo(product)
        }
    }

    @Test
    fun `extra photos hidden flag and sequence survive`() {
        val product = MockProductData.allProducts.first().copy(
            galleryImageKeys = listOf("file:///a.jpg", "file:///b.jpg"),
            isActive = false,
            sortOrder = 7,
            createdAtEpochMillis = 1234L,
        )
        val back = product.toEntity().toDomain()
        assertThat(back.galleryImageKeys).containsExactly("file:///a.jpg", "file:///b.jpg").inOrder()
        assertThat(back.isActive).isFalse()
        assertThat(back.sortOrder).isEqualTo(7)
        assertThat(back.createdAtEpochMillis).isEqualTo(1234L)
        assertThat(back.allImageKeys).hasSize(3)
    }

    @Test
    fun `text with quotes, newlines and non-latin letters is kept exactly`() {
        val product = MockProductData.allProducts.first().copy(
            name = "Kaju \"Katli\" – काजू कतली",
            description = "Line one\nLine two, with \\ backslash and 'quotes'",
            tags = listOf("मिठाई", "gift, box"),
        )
        assertThat(product.toEntity().toDomain()).isEqualTo(product)
    }

    @Test
    fun `starter ids are unique so seeding cannot overwrite itself`() {
        val ids = MockProductData.allProducts.map { it.id }
        assertThat(ids.toSet()).hasSize(ids.size)
    }
}
