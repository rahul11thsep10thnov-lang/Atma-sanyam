package com.wholesoul.app.presentation.categories

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.data.repository.RoomCategoryRepository
import com.wholesoul.app.fakes.InMemoryCatalog
import com.wholesoul.app.fakes.NoopCatalogSeeding
import com.wholesoul.app.fakes.RecordingCatalogChanges
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class CategoriesViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val shop = InMemoryCatalog().apply {
        addCategory("fruits", "Fruits")
        addCategory("sweets", "Sweets")
        addCategory("empty", "Empty")
        addProduct("mango", "fruits")
        addProduct("laddu", "sweets")
    }
    private val changes = RecordingCatalogChanges()

    private fun viewModel() = CategoriesViewModel(RoomCategoryRepository(shop.categoryDao, shop.productDao, NoopCatalogSeeding()), changes)

    private fun CategoriesViewModel.names() = (uiState.value as UiState.Success).data.map { it.displayName }

    @Test
    fun `customers see categories in the admin's order and not empty ones`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()
        assertThat(vm.names()).containsExactly("Fruits", "Sweets").inOrder()
    }

    @Test
    fun `a re-sequenced or newly hidden category shows without reopening the screen`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel(); advanceUntilIdle()

        shop.categoryDao.setSortOrder("sweets", -1)
        changes.notifyChanged(); advanceUntilIdle()
        assertThat(vm.names()).containsExactly("Sweets", "Fruits").inOrder()

        shop.productDao.setActive(listOf("laddu"), false)
        changes.notifyChanged(); advanceUntilIdle()
        assertThat(vm.names()).containsExactly("Fruits")
    }
}
