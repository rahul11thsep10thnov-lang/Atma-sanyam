package com.wholesoul.app.data.catalog

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.fakes.DirectTransactionRunner
import com.wholesoul.app.fakes.InMemoryCatalog
import com.wholesoul.app.fakes.InMemorySeedFlag
import com.wholesoul.app.fakes.RecordingCatalogChanges
import kotlinx.coroutines.test.runTest
import org.junit.Test

class CatalogSeederTest {

    private val catalog = InMemoryCatalog()
    private val flag = InMemorySeedFlag()
    private val changes = RecordingCatalogChanges()
    private val seeder = CatalogSeeder(catalog.productDao, catalog.categoryDao, DirectTransactionRunner(), flag, changes)

    @Test
    fun `first launch fills the shop with the starter catalog`() = runTest {
        seeder.ensureSeeded()

        assertThat(catalog.categories.value.map { it.id }).containsExactlyElementsIn(DefaultCategory.entries.map { it.id }).inOrder()
        assertThat(catalog.products.value.size).isAtLeast(360)
        assertThat(flag.seeded).isTrue()
        assertThat(changes.notifications).isEqualTo(1)
    }

    @Test
    fun `starter items are numbered 0, 1, 2 inside each category`() = runTest {
        seeder.ensureSeeded()
        DefaultCategory.entries.forEach { category ->
            val orders = catalog.products.value.filter { it.categoryId == category.id }.map { it.sortOrder }.sorted()
            assertThat(orders).isEqualTo(orders.indices.toList())
        }
    }

    @Test
    fun `seeding runs only once even when called repeatedly`() = runTest {
        seeder.ensureSeeded()
        catalog.productDao.deleteByIds(catalog.products.value.map { it.id })
        seeder.ensureSeeded()
        assertThat(catalog.products.value).isEmpty()
    }

    @Test
    fun `an owner who deleted everything does not get the demo data back on next launch`() = runTest {
        seeder.ensureSeeded()
        catalog.productDao.deleteByIds(catalog.products.value.map { it.id })
        catalog.categories.value.forEach { catalog.categoryDao.delete(it.id) }

        // A fresh process: new seeder instance, same persisted flag.
        CatalogSeeder(catalog.productDao, catalog.categoryDao, DirectTransactionRunner(), flag, changes).ensureSeeded()

        assertThat(catalog.products.value).isEmpty()
        assertThat(catalog.categories.value).isEmpty()
    }

    @Test
    fun `existing shop data is never overwritten`() = runTest {
        catalog.addCategory("mine")
        catalog.addProduct("p", "mine")
        seeder.ensureSeeded()
        assertThat(catalog.categories.value.map { it.id }).containsExactly("mine")
        assertThat(flag.seeded).isTrue()
    }
}
