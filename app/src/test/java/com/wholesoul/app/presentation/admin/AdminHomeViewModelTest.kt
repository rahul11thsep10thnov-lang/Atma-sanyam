package com.wholesoul.app.presentation.admin

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.admin.AdminPinStore
import com.wholesoul.app.data.admin.PinAdminAccess
import com.wholesoul.app.data.admin.StoredPin
import com.wholesoul.app.domain.repository.MoveDirection
import com.wholesoul.app.fakes.FakeImageStore
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class AdminHomeViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val shop = AdminShop()
    private val images = FakeImageStore()
    private val access = PinAdminAccess(object : AdminPinStore {
        override suspend fun load(): StoredPin? = null
        override suspend fun save(pin: StoredPin) = Unit
    })

    private fun viewModel() = AdminHomeViewModel(shop.repository, access, images)

    @Test
    fun `lists every item including hidden ones, grouped by category sequence`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        val state = vm.uiState.value
        assertThat(state.products.map { it.id }).containsExactly("mango", "apple", "laddu").inOrder()
        assertThat(state.categories.map { it.displayName }).containsExactly("Fruits", "Sweets").inOrder()
    }

    @Test
    fun `category chip and search narrow the list`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()

        vm.filterByCategory("fruits")
        assertThat(vm.uiState.value.shownProducts.map { it.id }).containsExactly("mango", "apple")
        vm.onQueryChange("app")
        assertThat(vm.uiState.value.shownProducts.map { it.id }).containsExactly("apple")
        vm.onQueryChange("")
        vm.filterByCategory(null)
        assertThat(vm.uiState.value.shownProducts).hasSize(3)
    }

    @Test
    fun `select all picks everything currently listed and a second tap clears it`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        vm.filterByCategory("fruits")

        vm.toggleSelectAll()
        assertThat(vm.uiState.value.selectedIds).containsExactly("mango", "apple")
        assertThat(vm.uiState.value.allShownSelected).isTrue()

        vm.toggleSelectAll()
        assertThat(vm.uiState.value.selectedIds).isEmpty()
    }

    @Test
    fun `select all ticks the rest when only some items are ticked`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        vm.toggleSelected("laddu")
        vm.filterByCategory("fruits")           // changing the list clears the selection
        assertThat(vm.uiState.value.selectedIds).isEmpty()
        vm.toggleSelectAll()
        vm.toggleSelected("mango")              // untick one
        assertThat(vm.uiState.value.selectedIds).containsExactly("apple")
        assertThat(vm.uiState.value.allShownSelected).isFalse()
        vm.toggleSelectAll()                    // not everything ticked -> tick the rest
        assertThat(vm.uiState.value.selectedIds).containsExactly("mango", "apple")
    }

    @Test
    fun `hide and show apply to the selection and then clear it`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        vm.toggleSelected("mango"); vm.toggleSelected("apple")

        vm.hideSelected(); advanceUntilIdle()
        assertThat(shop.catalog.product("mango")!!.isActive).isFalse()
        assertThat(shop.catalog.product("apple")!!.isActive).isFalse()
        assertThat(vm.uiState.value.selectedIds).isEmpty()
        assertThat(vm.uiState.value.message).isEqualTo("Hidden 2 items from customers")

        vm.toggleSelected("mango")
        vm.showSelected(); advanceUntilIdle()
        assertThat(shop.catalog.product("mango")!!.isActive).isTrue()
        assertThat(vm.uiState.value.message).isEqualTo("Showing 1 item to customers")
    }

    @Test
    fun `move to category puts the selection in the chosen category`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        vm.toggleSelected("mango")
        vm.moveSelectedTo("sweets"); advanceUntilIdle()

        assertThat(shop.catalog.product("mango")!!.categoryId).isEqualTo("sweets")
        assertThat(vm.uiState.value.message).isEqualTo("Moved 1 item to Sweets")
    }

    @Test
    fun `delete removes the selection and the photos that were imported for it`() = runTest(mainDispatcherRule.testDispatcher) {
        val photo = "file:///photos/own.jpg"
        shop.catalog.productDao.upsert(shop.catalog.product("mango")!!.copy(imageKey = photo))
        val vm = viewModel(); advanceUntilIdle()

        vm.toggleSelected("mango"); vm.toggleSelected("apple")
        vm.deleteSelected(); advanceUntilIdle()

        assertThat(shop.catalog.products.value.map { it.id }).containsExactly("laddu")
        assertThat(images.deleted).containsExactly(photo)
    }

    @Test
    fun `selection ignores items deleted behind its back`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        vm.toggleSelected("mango")
        shop.catalog.productDao.deleteByIds(listOf("mango"))
        advanceUntilIdle()
        assertThat(vm.uiState.value.selectedIds).isEmpty()
        assertThat(vm.uiState.value.isSelecting).isFalse()
    }

    @Test
    fun `item arrows only matter inside one category with no search`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        assertThat(vm.uiState.value.canReorderItems).isFalse()
        vm.filterByCategory("fruits")
        assertThat(vm.uiState.value.canReorderItems).isTrue()
        vm.onQueryChange("m")
        assertThat(vm.uiState.value.canReorderItems).isFalse()
    }

    @Test
    fun `moving items and categories re-sequences them`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()

        vm.moveItem("apple", MoveDirection.UP); advanceUntilIdle()
        assertThat(vm.uiState.value.products.filter { it.categoryId == "fruits" }.map { it.id }).containsExactly("apple", "mango").inOrder()

        vm.moveCategory("sweets", MoveDirection.UP); advanceUntilIdle()
        assertThat(vm.uiState.value.categories.map { it.id }).containsExactly("sweets", "fruits").inOrder()
    }

    @Test
    fun `a filter on a deleted category falls back to all`() = runTest(mainDispatcherRule.testDispatcher) {
        shop.catalog.addCategory("empty", "Empty")
        val vm = viewModel(); advanceUntilIdle()
        vm.filterByCategory("empty")
        assertThat(vm.uiState.value.categoryFilter).isEqualTo("empty")
        shop.repository.deleteCategory("empty"); advanceUntilIdle()
        assertThat(vm.uiState.value.categoryFilter).isNull()
    }

    @Test
    fun `locking from the console locks the gate`() = runTest(mainDispatcherRule.testDispatcher) {
        access.setPin("2468")
        val vm = viewModel(); advanceUntilIdle()
        vm.lock()
        assertThat(access.isUnlocked.value).isFalse()
    }
}
