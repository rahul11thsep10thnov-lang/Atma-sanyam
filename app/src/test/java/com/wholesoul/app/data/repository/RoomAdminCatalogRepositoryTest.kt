package com.wholesoul.app.data.repository

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.repository.MoveDirection
import com.wholesoul.app.fakes.DirectTransactionRunner
import com.wholesoul.app.fakes.InMemoryCatalog
import com.wholesoul.app.fakes.NoopCatalogSeeding
import com.wholesoul.app.fakes.RecordingCatalogChanges
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Test

class RoomAdminCatalogRepositoryTest {

    private val catalog = InMemoryCatalog()
    private val changes = RecordingCatalogChanges()
    private val repository = RoomAdminCatalogRepository(
        productDao = catalog.productDao,
        categoryDao = catalog.categoryDao,
        transactions = DirectTransactionRunner(),
        changes = changes,
        seeding = NoopCatalogSeeding(),
    )

    private fun category(id: String, name: String = id) = Category(id = id, displayName = name, imageKey = "categories/$id", productCount = 0)

    private suspend fun product(id: String, categoryId: String, name: String = id, price: Double = 50.0, mrp: Double = 60.0, stock: Int = 5) =
        catalog.addProduct(id, categoryId, name, price, mrp, stock).let { repository.getProduct(id)!! }

    private suspend fun categoryOrder() = repository.observeCategories().first().map { it.id }

    // --- categories ---

    @Test
    fun `new categories are added at the end`() = runTest {
        assertThat(repository.saveCategory(category("a")).isSuccess).isTrue()
        assertThat(repository.saveCategory(category("b")).isSuccess).isTrue()
        assertThat(repository.saveCategory(category("c")).isSuccess).isTrue()
        assertThat(categoryOrder()).containsExactly("a", "b", "c").inOrder()
    }

    @Test
    fun `editing a category keeps its place in the sequence`() = runTest {
        repository.saveCategory(category("a"))
        repository.saveCategory(category("b"))
        repository.saveCategory(category("a", name = "Renamed"))
        assertThat(categoryOrder()).containsExactly("a", "b").inOrder()
        assertThat(repository.getCategory("a")!!.displayName).isEqualTo("Renamed")
    }

    @Test
    fun `category names cannot be blank or duplicated`() = runTest {
        assertThat(repository.saveCategory(category("a", name = "  ")).isFailure).isTrue()
        repository.saveCategory(category("a", name = "Sweets"))
        val clash = repository.saveCategory(category("b", name = " sweets "))
        assertThat(clash.exceptionOrNull()).hasMessageThat().contains("already exists")
    }

    @Test
    fun `moving a category swaps it with its neighbour`() = runTest {
        listOf("a", "b", "c").forEach { repository.saveCategory(category(it)) }
        repository.moveCategory("c", MoveDirection.UP)
        assertThat(categoryOrder()).containsExactly("a", "c", "b").inOrder()
        repository.moveCategory("a", MoveDirection.DOWN)
        assertThat(categoryOrder()).containsExactly("c", "a", "b").inOrder()
    }

    @Test
    fun `moving past either end changes nothing`() = runTest {
        listOf("a", "b").forEach { repository.saveCategory(category(it)) }
        assertThat(repository.moveCategory("a", MoveDirection.UP).isSuccess).isTrue()
        assertThat(repository.moveCategory("b", MoveDirection.DOWN).isSuccess).isTrue()
        assertThat(categoryOrder()).containsExactly("a", "b").inOrder()
    }

    @Test
    fun `a category with items cannot be deleted until they are moved or removed`() = runTest {
        repository.saveCategory(category("a", "Fruits"))
        product("p1", "a")
        val refused = repository.deleteCategory("a")
        assertThat(refused.exceptionOrNull()).hasMessageThat().contains("still has 1 item")
        assertThat(repository.getCategory("a")).isNotNull()

        repository.deleteProducts(setOf("p1"))
        assertThat(repository.deleteCategory("a").isSuccess).isTrue()
        assertThat(repository.getCategory("a")).isNull()
    }

    @Test
    fun `category counts include hidden items`() = runTest {
        repository.saveCategory(category("a"))
        product("p1", "a")
        product("p2", "a")
        repository.setProductsActive(setOf("p2"), false)
        assertThat(repository.observeCategories().first().single().productCount).isEqualTo(2)
    }

    // --- products ---

    @Test
    fun `saving a product validates the form`() = runTest {
        repository.saveCategory(category("a"))
        val base = product("p1", "a")

        assertThat(repository.saveProduct(base.copy(name = " ")).exceptionOrNull()).hasMessageThat().contains("name")
        assertThat(repository.saveProduct(base.copy(categoryId = "nope")).exceptionOrNull()).hasMessageThat().contains("category")
        assertThat(repository.saveProduct(base.copy(price = 0.0)).exceptionOrNull()).hasMessageThat().contains("Selling price")
        assertThat(repository.saveProduct(base.copy(price = 70.0, mrp = 60.0)).exceptionOrNull()).hasMessageThat().contains("higher than the listed")
        assertThat(repository.saveProduct(base.copy(stock = -1)).exceptionOrNull()).hasMessageThat().contains("negative")
        assertThat(repository.saveProduct(base.copy(price = 55.0, mrp = 60.0, stock = 0)).isSuccess).isTrue()
    }

    @Test
    fun `new products are added at the end of their category and editing keeps their place`() = runTest {
        repository.saveCategory(category("a"))
        val first = product("p1", "a")
        catalog.products.value = emptyList()
        repository.saveProduct(first.copy(id = "x1"))
        repository.saveProduct(first.copy(id = "x2"))
        repository.saveProduct(first.copy(id = "x3"))
        repository.saveProduct(first.copy(id = "x1", name = "Edited"))
        assertThat(catalog.idsInCategory("a")).containsExactly("x1", "x2", "x3").inOrder()
    }

    @Test
    fun `moving an item swaps it with its neighbour inside the category`() = runTest {
        repository.saveCategory(category("a"))
        repository.saveCategory(category("b"))
        product("a1", "a"); product("a2", "a"); product("a3", "a"); product("b1", "b")

        repository.moveProduct("a3", MoveDirection.UP)
        assertThat(catalog.idsInCategory("a")).containsExactly("a1", "a3", "a2").inOrder()
        repository.moveProduct("a1", MoveDirection.UP)
        assertThat(catalog.idsInCategory("a")).containsExactly("a1", "a3", "a2").inOrder()
        assertThat(catalog.idsInCategory("b")).containsExactly("b1")
    }

    @Test
    fun `changing an item's category puts it last in the new category`() = runTest {
        repository.saveCategory(category("a"))
        repository.saveCategory(category("b"))
        product("a1", "a"); product("b1", "b"); product("b2", "b")

        repository.saveProduct(repository.getProduct("a1")!!.copy(categoryId = "b"))
        assertThat(catalog.idsInCategory("b")).containsExactly("b1", "b2", "a1").inOrder()
    }

    @Test
    fun `setting stock never goes below zero`() = runTest {
        repository.saveCategory(category("a"))
        product("p1", "a")
        repository.setStock("p1", 42)
        assertThat(repository.getProduct("p1")!!.stock).isEqualTo(42)
        repository.setStock("p1", -5)
        assertThat(repository.getProduct("p1")!!.stock).isEqualTo(0)
    }

    // --- bulk actions ---

    @Test
    fun `bulk hide and show change visibility for every chosen item`() = runTest {
        repository.saveCategory(category("a"))
        listOf("p1", "p2", "p3").forEach { product(it, "a") }

        repository.setProductsActive(setOf("p1", "p2"), false)
        assertThat(catalog.products.value.filter { !it.isActive }.map { it.id }).containsExactly("p1", "p2")

        repository.setProductsActive(setOf("p1", "p2"), true)
        assertThat(catalog.products.value.all { it.isActive }).isTrue()
    }

    @Test
    fun `bulk move appends the items to the target category in their old order`() = runTest {
        repository.saveCategory(category("a"))
        repository.saveCategory(category("b"))
        product("a1", "a"); product("a2", "a"); product("a3", "a"); product("b1", "b")

        repository.moveProductsToCategory(setOf("a3", "a1"), "b")
        assertThat(catalog.idsInCategory("b")).containsExactly("b1", "a1", "a3").inOrder()
        assertThat(catalog.idsInCategory("a")).containsExactly("a2")
    }

    @Test
    fun `bulk move to a missing category is refused`() = runTest {
        repository.saveCategory(category("a"))
        product("a1", "a")
        assertThat(repository.moveProductsToCategory(setOf("a1"), "ghost").isFailure).isTrue()
        assertThat(catalog.idsInCategory("a")).containsExactly("a1")
    }

    @Test
    fun `bulk delete handles more items than one database statement can take`() = runTest {
        repository.saveCategory(category("a"))
        val ids = (1..1200).map { "p$it" }
        ids.forEach { catalog.addProduct(it, "a") }
        assertThat(repository.deleteProducts(ids.toSet()).isSuccess).isTrue()
        assertThat(catalog.products.value).isEmpty()
    }

    // --- refresh notifications ---

    @Test
    fun `successful edits tell customer screens to refresh and failed ones do not`() = runTest {
        repository.saveCategory(category("a"))
        assertThat(changes.notifications).isEqualTo(1)

        repository.saveCategory(category("b", name = ""))
        assertThat(changes.notifications).isEqualTo(1)

        repository.deleteProducts(setOf("nothing"))
        assertThat(changes.notifications).isEqualTo(2)
    }

    @Test
    fun `observeProducts includes hidden items`() = runTest {
        repository.saveCategory(category("a"))
        product("p1", "a")
        repository.setProductsActive(setOf("p1"), false)
        assertThat(repository.observeProducts().first().map { it.id }).containsExactly("p1")
        assertThat(catalog.products.value.single().toDomain().isActive).isFalse()
    }
}
