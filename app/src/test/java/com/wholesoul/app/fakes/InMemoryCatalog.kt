package com.wholesoul.app.fakes

import com.wholesoul.app.data.catalog.CatalogSeedFlag
import com.wholesoul.app.data.catalog.CatalogSeeding
import com.wholesoul.app.data.catalog.DefaultCategory
import com.wholesoul.app.data.local.TransactionRunner
import com.wholesoul.app.data.local.dao.CartDao
import com.wholesoul.app.data.local.dao.CategoryDao
import com.wholesoul.app.data.local.dao.OrderDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.entity.CartItemEntity
import com.wholesoul.app.data.local.entity.CartMetaEntity
import com.wholesoul.app.data.local.entity.CategoryCount
import com.wholesoul.app.data.local.entity.CategoryEntity
import com.wholesoul.app.data.local.entity.OrderEntity
import com.wholesoul.app.data.local.entity.ProductEntity
import com.wholesoul.app.data.local.entity.toEntity
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.domain.repository.CatalogChanges
import com.wholesoul.app.domain.repository.ImageStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.map

/**
 * Plain-Kotlin stand-ins for the Room DAOs so repository and ViewModel logic can be unit tested
 * on the JVM. They mirror what the SQL in `CatalogDaos.kt` is meant to do; `CatalogDaoTest`
 * (instrumented) runs the real SQL against a real database.
 */
class InMemoryCatalog {
    val categories = MutableStateFlow<List<CategoryEntity>>(emptyList())
    val products = MutableStateFlow<List<ProductEntity>>(emptyList())

    val categoryDao: CategoryDao = FakeCategoryDao(this)
    val productDao: ProductDao = FakeProductDao(this)

    fun addCategory(id: String, name: String = id, sortOrder: Int = categories.value.size, isActive: Boolean = true) {
        categories.value = categories.value + CategoryEntity(id, name, "categories/$id", sortOrder, isActive)
    }

    fun addProduct(
        id: String,
        categoryId: String,
        name: String = id,
        price: Double = 50.0,
        mrp: Double = 60.0,
        stock: Int = 10,
        sortOrder: Int = products.value.count { it.categoryId == categoryId },
        isActive: Boolean = true,
    ) {
        val product = MockProductData.allProducts.first().copy(
            id = id, name = name, categoryId = categoryId, price = price, mrp = mrp, stock = stock,
            sortOrder = sortOrder, isActive = isActive, tags = listOf(), freshnessInfo = null, flowerInfo = null,
        )
        products.value = products.value + product.toEntity()
    }

    fun idsInCategory(categoryId: String): List<String> =
        products.value.filter { it.categoryId == categoryId }.sortedWith(compareBy({ it.sortOrder }, { it.name })).map { it.id }

    fun product(id: String): ProductEntity? = products.value.firstOrNull { it.id == id }

    /** The same starter content the app seeds on first launch. */
    fun seedStarterCatalog() {
        categories.value = DefaultCategory.entries.mapIndexed { index, c ->
            CategoryEntity(c.id, c.displayName, "categories/${c.id}", index, true)
        }
        products.value = MockProductData.allProducts
            .groupBy { it.categoryId }
            .flatMap { (_, items) -> items.mapIndexed { i, p -> p.copy(sortOrder = i).toEntity() } }
    }
}

private fun <T> MutableStateFlow<List<T>>.edit(change: (List<T>) -> List<T>) {
    value = change(value)
}

class FakeCategoryDao(private val db: InMemoryCatalog) : CategoryDao {
    private fun sorted(list: List<CategoryEntity>) = list.sortedWith(compareBy({ it.sortOrder }, { it.name }))

    override fun observeAll(): Flow<List<CategoryEntity>> = db.categories.map(::sorted)
    override suspend fun getAll(): List<CategoryEntity> = sorted(db.categories.value)
    override suspend fun getById(id: String): CategoryEntity? = db.categories.value.firstOrNull { it.id == id }
    override suspend fun count(): Int = db.categories.value.size
    override suspend fun maxSortOrder(): Int? = db.categories.value.maxOfOrNull { it.sortOrder }
    override suspend fun upsert(category: CategoryEntity) = db.categories.edit { list -> list.filterNot { it.id == category.id } + category }
    override suspend fun upsertAll(categories: List<CategoryEntity>) =
        db.categories.edit { list -> list.filterNot { old -> categories.any { it.id == old.id } } + categories }
    override suspend fun delete(id: String) = db.categories.edit { list -> list.filterNot { it.id == id } }
    override suspend fun setSortOrder(id: String, sortOrder: Int) =
        db.categories.edit { list -> list.map { if (it.id == id) it.copy(sortOrder = sortOrder) else it } }
}

class FakeProductDao(private val db: InMemoryCatalog) : ProductDao {

    private fun categoryOf(product: ProductEntity) = db.categories.value.firstOrNull { it.id == product.categoryId }

    private fun visible(): List<ProductEntity> = db.products.value.filter { it.isActive && categoryOf(it)?.isActive == true }

    private fun inCatalogOrder(list: List<ProductEntity>) = list.sortedWith(
        compareBy<ProductEntity>({ categoryOf(it)?.sortOrder ?: Int.MAX_VALUE }, { it.categoryId }, { it.sortOrder }, { it.name }),
    )

    override fun observeAll(): Flow<List<ProductEntity>> =
        kotlinx.coroutines.flow.combine(db.products, db.categories) { products, _ -> inCatalogOrder(products) }

    override suspend fun getVisible(): List<ProductEntity> = inCatalogOrder(visible())

    override suspend fun getVisibleInCategory(categoryId: String): List<ProductEntity> =
        visible().filter { it.categoryId == categoryId }.sortedWith(compareBy({ it.sortOrder }, { it.name }))

    override fun observeVisibleByIds(ids: List<String>): Flow<List<ProductEntity>> =
        kotlinx.coroutines.flow.combine(db.products, db.categories) { _, _ -> visible().filter { it.id in ids } }

    override suspend fun getAllInCategory(categoryId: String): List<ProductEntity> =
        db.products.value.filter { it.categoryId == categoryId }.sortedWith(compareBy({ it.sortOrder }, { it.name }))

    override suspend fun getById(id: String): ProductEntity? = db.products.value.firstOrNull { it.id == id }
    override suspend fun count(): Int = db.products.value.size
    override suspend fun countInCategory(categoryId: String): Int = db.products.value.count { it.categoryId == categoryId }
    override suspend fun maxSortOrder(categoryId: String): Int? =
        db.products.value.filter { it.categoryId == categoryId }.maxOfOrNull { it.sortOrder }

    private fun counts(): List<CategoryCount> = db.products.value.groupBy { it.categoryId }.map { (id, list) ->
        CategoryCount(id, list.size, list.count { it.isActive })
    }

    override fun observeCategoryCounts(): Flow<List<CategoryCount>> = db.products.map { counts() }
    override suspend fun getCategoryCounts(): List<CategoryCount> = counts()

    override suspend fun upsert(product: ProductEntity) = db.products.edit { list -> list.filterNot { it.id == product.id } + product }
    override suspend fun upsertAll(products: List<ProductEntity>) =
        db.products.edit { list -> list.filterNot { old -> products.any { it.id == old.id } } + products }
    override suspend fun deleteByIds(ids: List<String>) = db.products.edit { list -> list.filterNot { it.id in ids } }
    override suspend fun setActive(ids: List<String>, active: Boolean) =
        db.products.edit { list -> list.map { if (it.id in ids) it.copy(isActive = active) else it } }
    override suspend fun setStock(id: String, stock: Int) =
        db.products.edit { list -> list.map { if (it.id == id) it.copy(stock = stock) else it } }
    override suspend fun decreaseStock(id: String, quantity: Int) =
        db.products.edit { list -> list.map { if (it.id == id) it.copy(stock = maxOf(it.stock - quantity, 0)) else it } }
    override suspend fun increaseStock(id: String, quantity: Int) =
        db.products.edit { list -> list.map { if (it.id == id) it.copy(stock = it.stock + quantity) else it } }
    override suspend fun setSortOrder(id: String, sortOrder: Int) =
        db.products.edit { list -> list.map { if (it.id == id) it.copy(sortOrder = sortOrder) else it } }
    override suspend fun moveToCategory(id: String, categoryId: String, sortOrder: Int) =
        db.products.edit { list -> list.map { if (it.id == id) it.copy(categoryId = categoryId, sortOrder = sortOrder) else it } }
}

class FakeCartDao : CartDao {
    private val items = MutableStateFlow<List<CartItemEntity>>(emptyList())
    private val meta = MutableStateFlow<CartMetaEntity?>(null)

    override fun observeItems(): Flow<List<CartItemEntity>> = items
    override suspend fun getItem(productId: String): CartItemEntity? = items.value.firstOrNull { it.productId == productId }
    override suspend fun upsert(item: CartItemEntity) = items.edit { list -> list.filterNot { it.productId == item.productId } + item }
    override suspend fun delete(productId: String) = items.edit { list -> list.filterNot { it.productId == productId } }
    override suspend fun clear() = items.edit { emptyList() }
    override fun observeMeta(): Flow<CartMetaEntity?> = meta
    override suspend fun upsertMeta(meta: CartMetaEntity) { this.meta.value = meta }
}

class FakeOrderDao : OrderDao {
    private val orders = MutableStateFlow<List<OrderEntity>>(emptyList())

    override fun observeAll(): Flow<List<OrderEntity>> = orders.map { list -> list.sortedByDescending { it.placedAtEpochMillis } }
    override suspend fun getById(id: String): OrderEntity? = orders.value.firstOrNull { it.id == id }
    override suspend fun insert(order: OrderEntity) = orders.edit { list -> list.filterNot { it.id == order.id } + order }
    override suspend fun update(order: OrderEntity) = orders.edit { list -> list.map { if (it.id == order.id) order else it } }
    override suspend fun count(): Int = orders.value.size
}

class DirectTransactionRunner : TransactionRunner {
    override suspend fun <T> run(block: suspend () -> T): T = block()
}

class NoopCatalogSeeding : CatalogSeeding {
    override suspend fun ensureSeeded() = Unit
}

class InMemorySeedFlag(var seeded: Boolean = false) : CatalogSeedFlag {
    override suspend fun isSeeded() = seeded
    override suspend fun markSeeded() { seeded = true }
}

/** Counts change notifications so tests can check that edits tell the customer screens to refresh. */
class RecordingCatalogChanges : CatalogChanges {
    private val bus = MutableSharedFlow<Unit>(extraBufferCapacity = 16)
    var notifications = 0
        private set

    override val events: Flow<Unit> = bus.asSharedFlow()

    override fun notifyChanged() {
        notifications++
        bus.tryEmit(Unit)
    }
}

class FakeImageStore : ImageStore {
    val imported = mutableListOf<String>()
    val deleted = mutableListOf<String>()
    var failOn: Set<String> = emptySet()
    private var counter = 0

    override suspend fun importPhoto(sourceUri: String): Result<String> {
        if (sourceUri in failOn) return Result.failure(IllegalArgumentException("bad photo"))
        val key = "file:///photos/${++counter}.jpg"
        imported += key
        return Result.success(key)
    }

    override fun delete(imageKey: String) {
        deleted += imageKey
    }
}
