package com.wholesoul.app.presentation.admin

import androidx.lifecycle.SavedStateHandle
import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.fakes.FakeImageStore
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class AdminCategoryEditViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val shop = AdminShop()
    private val images = FakeImageStore()

    private fun newCategory() = AdminCategoryEditViewModel(SavedStateHandle(mapOf("categoryId" to "new")), shop.repository, images)
    private fun existing(id: String) = AdminCategoryEditViewModel(SavedStateHandle(mapOf("categoryId" to id)), shop.repository, images)

    @Test
    fun `a new category gets a readable id and goes last`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newCategory(); advanceUntilIdle()
        vm.onNameChange("Dry Fruits & Nuts")
        vm.save(); advanceUntilIdle()

        assertThat(vm.uiState.value.finished).isTrue()
        assertThat(shop.catalog.categories.value.map { it.id }).containsExactly("fruits", "sweets", "dry-fruits-nuts").inOrder()
        assertThat(shop.catalog.categories.value.last().isActive).isTrue()
    }

    @Test
    fun `a name that would make the same id still gets its own category`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newCategory(); advanceUntilIdle()
        vm.onNameChange("Fruits!")        // slug "fruits" is taken, name is different
        vm.save(); advanceUntilIdle()
        assertThat(shop.catalog.categories.value.map { it.id }).contains("fruits-2")
    }

    @Test
    fun `a name in another script gets a generated id that works in a link`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newCategory(); advanceUntilIdle()
        vm.onNameChange("मिठाई")
        vm.save(); advanceUntilIdle()
        val created = shop.catalog.categories.value.last()
        assertThat(created.name).isEqualTo("मिठाई")
        assertThat(created.id).matches("category-[0-9a-f]{8}")
    }

    @Test
    fun `a blank name is rejected`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newCategory(); advanceUntilIdle()
        vm.onNameChange("   ")
        vm.save(); advanceUntilIdle()
        assertThat(vm.uiState.value.error).isEqualTo("Enter the category name")
        assertThat(vm.uiState.value.finished).isFalse()
    }

    @Test
    fun `a duplicate name shows the repository's message`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newCategory(); advanceUntilIdle()
        vm.onNameChange("sweets")
        vm.save(); advanceUntilIdle()
        assertThat(vm.uiState.value.error).contains("already exists")
    }

    @Test
    fun `renaming and hiding keeps the id and position`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = existing("fruits"); advanceUntilIdle()
        assertThat(vm.uiState.value.form.name).isEqualTo("Fruits")
        assertThat(vm.uiState.value.itemCount).isEqualTo(2)

        vm.onNameChange("Fresh Fruits"); vm.onVisibleChange(false)
        vm.save(); advanceUntilIdle()

        val saved = shop.catalog.categories.value.first { it.id == "fruits" }
        assertThat(saved.name).isEqualTo("Fresh Fruits")
        assertThat(saved.isActive).isFalse()
        assertThat(saved.sortOrder).isEqualTo(0)
    }

    @Test
    fun `a photo is imported and replacing it throws away the one picked a moment ago`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newCategory(); advanceUntilIdle()
        vm.setPhoto("content://one"); advanceUntilIdle()
        vm.setPhoto("content://two"); advanceUntilIdle()

        assertThat(vm.uiState.value.form.photo).isEqualTo(images.imported[1])
        assertThat(images.deleted).containsExactly(images.imported[0])
    }

    @Test
    fun `a category with items cannot be deleted and says why`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = existing("fruits"); advanceUntilIdle()
        vm.delete(); advanceUntilIdle()
        assertThat(vm.uiState.value.error).contains("still has 2 items")
        assertThat(vm.uiState.value.finished).isFalse()
        assertThat(shop.catalog.categories.value.map { it.id }).contains("fruits")
    }

    @Test
    fun `an empty category can be deleted`() = runTest(mainDispatcherRule.testDispatcher) {
        shop.catalog.addCategory("empty", "Empty")
        val vm = existing("empty"); advanceUntilIdle()
        vm.delete(); advanceUntilIdle()
        assertThat(vm.uiState.value.finished).isTrue()
        assertThat(shop.catalog.categories.value.map { it.id }).doesNotContain("empty")
    }
}
