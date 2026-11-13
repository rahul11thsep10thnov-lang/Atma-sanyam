package com.wholesoul.app.presentation.admin

import androidx.lifecycle.SavedStateHandle
import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.fakes.FakeImageStore
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class AdminProductEditViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val shop = AdminShop()
    private val images = FakeImageStore()

    private fun newItem(categoryId: String? = null) = AdminProductEditViewModel(
        SavedStateHandle(mapOf("productId" to "new", "categoryId" to categoryId)),
        shop.repository,
        images,
    )

    private fun existing(id: String) = AdminProductEditViewModel(SavedStateHandle(mapOf("productId" to id)), shop.repository, images)

    private fun AdminProductEditViewModel.fillValid(name: String = "Kaju Katli") = update {
        it.copy(name = name, categoryId = "sweets", listedPrice = "500", sellingPrice = "450", quantity = "20", weightLabel = "250 g", description = "Fresh")
    }

    @Test
    fun `a new item starts in the category the owner was looking at`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem("sweets"); advanceUntilIdle()
        assertThat(vm.uiState.value.isNew).isTrue()
        assertThat(vm.uiState.value.form.categoryId).isEqualTo("sweets")
        assertThat(vm.uiState.value.categories.map { it.id }).containsExactly("fruits", "sweets").inOrder()
    }

    @Test
    fun `saving a complete new item adds it at the end of its category`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.fillValid()
        vm.save(); advanceUntilIdle()

        assertThat(vm.uiState.value.finished).isTrue()
        val saved = shop.catalog.products.value.single { it.name == "Kaju Katli" }
        assertThat(saved.categoryId).isEqualTo("sweets")
        assertThat(saved.mrp).isEqualTo(500.0)
        assertThat(saved.price).isEqualTo(450.0)
        assertThat(saved.stock).isEqualTo(20)
        assertThat(saved.weightLabel).isEqualTo("250 g")
        assertThat(saved.isActive).isTrue()
        assertThat(saved.reviewCount).isEqualTo(0)
        assertThat(shop.catalog.idsInCategory("sweets").last()).isEqualTo(saved.id)
    }

    @Test
    fun `each missing or wrong field gets a plain message and nothing is saved`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        val before = shop.catalog.products.value.size

        vm.save()
        assertThat(vm.uiState.value.error).isEqualTo("Enter the item name")

        vm.update { it.copy(name = "X") }
        vm.update { it.copy(categoryId = "") }
        vm.save()
        assertThat(vm.uiState.value.error).isEqualTo("Choose a category")

        vm.update { it.copy(categoryId = "sweets") }
        vm.save()
        assertThat(vm.uiState.value.error).contains("listed price")

        vm.update { it.copy(listedPrice = "100") }
        vm.save()
        assertThat(vm.uiState.value.error).contains("selling price")

        vm.update { it.copy(sellingPrice = "150") }
        vm.save()
        assertThat(vm.uiState.value.error).contains("can't be higher")

        vm.update { it.copy(sellingPrice = "90") }
        vm.save()
        assertThat(vm.uiState.value.error).contains("quantity")

        advanceUntilIdle()
        assertThat(vm.uiState.value.finished).isFalse()
        assertThat(shop.catalog.products.value.size).isEqualTo(before)
    }

    @Test
    fun `prices may be typed with commas and show the discount`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.update { it.copy(listedPrice = "1,000", sellingPrice = "750") }
        assertThat(vm.uiState.value.discountPercent).isEqualTo(25)
    }

    @Test
    fun `a quantity of zero is allowed and marks the item sold out`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.fillValid(); vm.update { it.copy(quantity = "0") }
        vm.save(); advanceUntilIdle()
        assertThat(shop.catalog.products.value.single { it.name == "Kaju Katli" }.stock).isEqualTo(0)
    }

    @Test
    fun `editing an existing item loads its values and keeps its other details`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = existing("mango"); advanceUntilIdle()
        val form = vm.uiState.value.form
        assertThat(form.name).isEqualTo("Mango")
        assertThat(form.listedPrice).isEqualTo("100")
        assertThat(form.sellingPrice).isEqualTo("80")
        assertThat(form.quantity).isEqualTo("12")

        val before = shop.catalog.product("mango")!!
        vm.update { it.copy(sellingPrice = "75", quantity = "30") }
        vm.save(); advanceUntilIdle()

        val after = shop.catalog.product("mango")!!
        assertThat(after.price).isEqualTo(75.0)
        assertThat(after.stock).isEqualTo(30)
        assertThat(after.id).isEqualTo(before.id)
        assertThat(after.sortOrder).isEqualTo(before.sortOrder)
        assertThat(after.rating).isEqualTo(before.rating)
        assertThat(after.createdAtEpochMillis).isEqualTo(before.createdAtEpochMillis)
    }

    @Test
    fun `an unknown item shows not found`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = existing("ghost"); advanceUntilIdle()
        assertThat(vm.uiState.value.notFound).isTrue()
    }

    @Test
    fun `picked photos are imported and the first one becomes the main photo`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.addPhotos(listOf("content://a", "content://b", "content://c")); advanceUntilIdle()
        vm.fillValid(); vm.save(); advanceUntilIdle()

        val saved = shop.catalog.products.value.single { it.name == "Kaju Katli" }
        assertThat(saved.imageKey).isEqualTo(images.imported[0])
        assertThat(saved.galleryJson).contains(images.imported[1])
        assertThat(saved.galleryJson).contains(images.imported[2])
    }

    @Test
    fun `a photo that cannot be read is skipped with a message`() = runTest(mainDispatcherRule.testDispatcher) {
        images.failOn = setOf("content://bad")
        val vm = newItem(); advanceUntilIdle()
        vm.addPhotos(listOf("content://good", "content://bad")); advanceUntilIdle()
        assertThat(vm.uiState.value.form.photos).hasSize(1)
        assertThat(vm.uiState.value.error).contains("1 of the photos")
    }

    @Test
    fun `no more than six photos fit`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.addPhotos((1..4).map { "content://$it" }); advanceUntilIdle()
        vm.addPhotos((5..9).map { "content://$it" }); advanceUntilIdle()
        assertThat(vm.uiState.value.form.photos).hasSize(AdminProductEditViewModel.MAX_PHOTOS)
        assertThat(vm.uiState.value.error).contains("skipped")
    }

    @Test
    fun `tapping a photo makes it the main one`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.addPhotos(listOf("content://a", "content://b")); advanceUntilIdle()
        val (first, second) = vm.uiState.value.form.photos
        vm.makeMainPhoto(second)
        assertThat(vm.uiState.value.form.photos).containsExactly(second, first).inOrder()
    }

    @Test
    fun `removing a photo added in this edit deletes the file straight away`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.addPhotos(listOf("content://a")); advanceUntilIdle()
        val key = vm.uiState.value.form.photos.single()
        vm.removePhoto(key)
        assertThat(vm.uiState.value.form.photos).isEmpty()
        assertThat(images.deleted).containsExactly(key)
    }

    @Test
    fun `replacing a saved photo deletes the old file only after a successful save`() = runTest(mainDispatcherRule.testDispatcher) {
        val old = "file:///photos/old.jpg"
        shop.catalog.productDao.upsert(shop.catalog.product("mango")!!.copy(imageKey = old))
        val vm = existing("mango"); advanceUntilIdle()
        assertThat(vm.uiState.value.form.photos).containsExactly(old)

        vm.removePhoto(old)
        assertThat(images.deleted).isEmpty()          // not yet: the edit could still be abandoned
        vm.addPhotos(listOf("content://new")); advanceUntilIdle()
        vm.save(); advanceUntilIdle()

        assertThat(images.deleted).containsExactly(old)
        assertThat(shop.catalog.product("mango")!!.imageKey).isEqualTo(images.imported.single())
    }

    @Test
    fun `an item with no photo gets a placeholder key rather than a broken image`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.fillValid(); vm.save(); advanceUntilIdle()
        assertThat(shop.catalog.products.value.single { it.name == "Kaju Katli" }.imageKey).isEqualTo("products/kaju-katli")
    }

    @Test
    fun `an item named only in another script still gets a usable placeholder`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = newItem(); advanceUntilIdle()
        vm.fillValid(name = "काजू कतली"); vm.save(); advanceUntilIdle()
        assertThat(shop.catalog.products.value.single { it.name == "काजू कतली" }.imageKey).isEqualTo("products/item")
    }

    @Test
    fun `deleting an item removes it and its photos`() = runTest(mainDispatcherRule.testDispatcher) {
        val photo = "file:///photos/own.jpg"
        shop.catalog.productDao.upsert(shop.catalog.product("mango")!!.copy(imageKey = photo))
        val vm = existing("mango"); advanceUntilIdle()
        vm.delete(); advanceUntilIdle()

        assertThat(shop.catalog.product("mango")).isNull()
        assertThat(images.deleted).containsExactly(photo)
        assertThat(vm.uiState.value.finished).isTrue()
    }
}
