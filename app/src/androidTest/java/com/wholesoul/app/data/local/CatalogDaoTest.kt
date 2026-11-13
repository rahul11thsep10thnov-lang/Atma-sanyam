package com.wholesoul.app.data.local

import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.local.entity.CategoryEntity
import com.wholesoul.app.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test

/** Runs the catalog SQL against a real (in-memory) Room database. */
class CatalogDaoTest {

    private lateinit var db: CatalogDatabase

    @Before
    fun open() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        db = Room.inMemoryDatabaseBuilder(context, CatalogDatabase::class.java).allowMainThreadQueries().build()
    }

    @After
    fun close() = db.close()

    private fun category(id: String, order: Int, active: Boolean = true) = CategoryEntity(id, id.uppercase(), "k", order, active)

    private fun product(id: String, categoryId: String, order: Int, active: Boolean = true, stock: Int = 5) = ProductEntity(
        id = id, name = id, categoryId = categoryId, subCategory = "", description = "", imageKey = "k", galleryJson = "[]",
        mrp = 10.0, price = 9.0, unit = "", weightLabel = "", rating = 0f, reviewCount = 0, stock = stock, brand = "",
        tagsJson = "[]", origin = "", extrasJson = "{}", sortOrder = order, isActive = active, createdAtEpochMillis = 0L,
    )

    private fun seed() = runBlocking {
        db.categoryDao().upsertAll(listOf(category("a", 1), category("b", 0), category("c", 2, active = false)))
        db.productDao().upsertAll(
            listOf(
                product("a1", "a", 1), product("a2", "a", 0), product("a3", "a", 2, active = false),
                product("b1", "b", 0), product("c1", "c", 0),
            ),
        )
    }

    @Test
    fun customersOnlySeeSwitchedOnItemsInSwitchedOnCategories() = runBlocking {
        seed()
        assertThat(db.productDao().getVisible().map { it.id }).containsExactly("b1", "a2", "a1").inOrder()
        assertThat(db.productDao().getVisibleInCategory("a").map { it.id }).containsExactly("a2", "a1").inOrder()
        assertThat(db.productDao().getVisibleInCategory("c")).isEmpty()
        assertThat(db.productDao().observeVisibleByIds(listOf("a1", "a3", "c1")).first().map { it.id }).containsExactly("a1")
    }

    @Test
    fun theAdminSeesEverythingInSequence() = runBlocking {
        seed()
        assertThat(db.productDao().observeAll().first().map { it.id }).containsExactly("b1", "a2", "a1", "a3", "c1").inOrder()
    }

    @Test
    fun countsSplitTotalFromVisible() = runBlocking {
        seed()
        val a = db.productDao().getCategoryCounts().first { it.categoryId == "a" }
        assertThat(a.total).isEqualTo(3)
        assertThat(a.visible).isEqualTo(2)
    }

    @Test
    fun bulkUpdatesAndStockMath() = runBlocking {
        seed()
        val dao = db.productDao()
        dao.setActive(listOf("a1", "a2"), false)
        assertThat(dao.getById("a1")!!.isActive).isFalse()
        dao.decreaseStock("b1", 99)
        assertThat(dao.getById("b1")!!.stock).isEqualTo(0)
        dao.increaseStock("b1", 4)
        assertThat(dao.getById("b1")!!.stock).isEqualTo(4)
        dao.moveToCategory("a1", "b", 7)
        assertThat(dao.getById("a1")!!.categoryId).isEqualTo("b")
        assertThat(dao.maxSortOrder("b")).isEqualTo(7)
        dao.deleteByIds(listOf("a1", "a2"))
        assertThat(dao.countInCategory("a")).isEqualTo(1)
    }
}
