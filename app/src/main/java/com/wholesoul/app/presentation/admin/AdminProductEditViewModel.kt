package com.wholesoul.app.presentation.admin

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.image.isImportedPhoto
import com.wholesoul.app.core.util.toSlug
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.AdminCatalogRepository
import com.wholesoul.app.domain.repository.ImageStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

/** What the item form shows. Numbers stay as text so half-typed input like "12." isn't rejected. */
data class ProductForm(
    val name: String = "",
    val categoryId: String = "",
    val subCategory: String = "",
    val description: String = "",
    val brand: String = "",
    val weightLabel: String = "",
    val listedPrice: String = "",
    val sellingPrice: String = "",
    val quantity: String = "",
    val isVisible: Boolean = true,
    /** The first photo is the main one; the rest form the gallery. */
    val photos: List<String> = emptyList(),
)

data class ProductEditUiState(
    val isLoading: Boolean = true,
    val isNew: Boolean = true,
    val notFound: Boolean = false,
    val categories: List<Category> = emptyList(),
    val form: ProductForm = ProductForm(),
    val isImportingPhotos: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    /** Set once the item has been saved or deleted, so the screen can close. */
    val finished: Boolean = false,
) {
    val discountPercent: Int
        get() {
            val mrp = form.listedPrice.toMoney() ?: return 0
            val price = form.sellingPrice.toMoney() ?: return 0
            return if (mrp <= 0 || price > mrp) 0 else (((mrp - price) / mrp) * 100).toInt()
        }
}

internal fun String.toMoney(): Double? = trim().replace(",", "").toDoubleOrNull()

@HiltViewModel
class AdminProductEditViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: AdminCatalogRepository,
    private val imageStore: ImageStore,
) : ViewModel() {

    private val productId: String? = savedStateHandle.get<String>("productId")?.takeIf { it != NEW }
    private val presetCategoryId: String? = savedStateHandle.get<String>("categoryId")?.takeIf { it.isNotBlank() }

    private val _uiState = MutableStateFlow(ProductEditUiState(isNew = productId == null))
    val uiState: StateFlow<ProductEditUiState> = _uiState.asStateFlow()

    private var original: Product? = null

    /** Photos copied into the app during this edit; discarded again if the edit is abandoned. */
    private val importedThisSession = mutableSetOf<String>()
    private var saved = false

    init {
        viewModelScope.launch {
            val categories = repository.observeCategories().first()
            val product = productId?.let { repository.getProduct(it) }
            if (productId != null && product == null) {
                _uiState.update { it.copy(isLoading = false, notFound = true) }
                return@launch
            }
            original = product
            val form = if (product != null) {
                ProductForm(
                    name = product.name,
                    categoryId = product.categoryId,
                    subCategory = product.subCategory,
                    description = product.description,
                    brand = product.brand,
                    weightLabel = product.weightLabel,
                    listedPrice = product.mrp.toInputText(),
                    sellingPrice = product.price.toInputText(),
                    quantity = product.stock.toString(),
                    isVisible = product.isActive,
                    photos = product.allImageKeys.filter { it.isImportedPhoto() },
                )
            } else {
                ProductForm(
                    categoryId = presetCategoryId?.takeIf { id -> categories.any { it.id == id } }
                        ?: categories.firstOrNull()?.id.orEmpty(),
                )
            }
            _uiState.update { it.copy(isLoading = false, categories = categories, form = form) }
        }
    }

    // --- form fields ---

    fun update(transform: (ProductForm) -> ProductForm) {
        _uiState.update { it.copy(form = transform(it.form), error = null) }
    }

    // --- photos ---

    fun addPhotos(uris: List<String>) {
        if (uris.isEmpty()) return
        val room = MAX_PHOTOS - _uiState.value.form.photos.size
        if (room <= 0) return fail("An item can have up to $MAX_PHOTOS photos")
        _uiState.update { it.copy(isImportingPhotos = true, error = null) }
        viewModelScope.launch {
            var failures = 0
            val added = mutableListOf<String>()
            uris.take(room).forEach { uri ->
                imageStore.importPhoto(uri)
                    .onSuccess { key -> added += key; importedThisSession += key }
                    .onFailure { failures++ }
            }
            _uiState.update {
                it.copy(
                    isImportingPhotos = false,
                    form = it.form.copy(photos = it.form.photos + added),
                    error = when {
                        failures > 0 -> "Couldn't use $failures of the photos"
                        uris.size > room -> "Only $room more photos fit; the rest were skipped"
                        else -> null
                    },
                )
            }
        }
    }

    fun removePhoto(key: String) {
        update { it.copy(photos = it.photos - key) }
        // A photo added in this very edit was never saved anywhere, so it can go right away.
        if (importedThisSession.remove(key)) imageStore.delete(key)
    }

    fun makeMainPhoto(key: String) {
        update { form -> form.copy(photos = listOf(key) + (form.photos - key)) }
    }

    // --- save / delete ---

    fun save() {
        val state = _uiState.value
        if (state.isSaving || state.isImportingPhotos) return
        val form = state.form
        val name = form.name.trim()
        if (name.isEmpty()) return fail("Enter the item name")
        if (form.categoryId.isBlank()) return fail("Choose a category")
        val mrp = form.listedPrice.toMoney() ?: return fail("Enter the listed price (MRP)")
        val price = form.sellingPrice.toMoney() ?: return fail("Enter the selling price")
        if (price <= 0) return fail("Selling price must be more than 0")
        if (price > mrp) return fail("Selling price can't be higher than the listed price")
        val stock = form.quantity.trim().toIntOrNull() ?: return fail("Enter the quantity available (0 if sold out)")
        if (stock < 0) return fail("Quantity can't be negative")

        val base = original
        val primary = form.photos.firstOrNull() ?: base?.imageKey?.takeUnless { it.isImportedPhoto() } ?: "products/${name.toSlug().ifEmpty { "item" }}"
        val product = (base ?: Product(
            id = "item-${UUID.randomUUID()}",
            name = name,
            categoryId = form.categoryId,
            subCategory = "",
            description = "",
            imageKey = primary,
            mrp = mrp,
            price = price,
            unit = "",
            weightLabel = "",
            rating = 0f,
            reviewCount = 0,
            stock = stock,
            brand = "",
            tags = listOf(),
            origin = "",
            createdAtEpochMillis = System.currentTimeMillis(),
        )).copy(
            name = name,
            categoryId = form.categoryId,
            subCategory = form.subCategory.trim(),
            description = form.description.trim(),
            brand = form.brand.trim(),
            weightLabel = form.weightLabel.trim(),
            unit = form.weightLabel.trim(),
            imageKey = primary,
            galleryImageKeys = form.photos.drop(1),
            mrp = mrp,
            price = price,
            stock = stock,
            isActive = form.isVisible,
            tags = base?.tags ?: name.lowercase().split(' ').filter { it.isNotBlank() },
        )

        _uiState.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            repository.saveProduct(product)
                .onSuccess {
                    saved = true
                    // Photos the item no longer uses can now be removed from the phone.
                    val kept = product.allImageKeys.toSet()
                    base?.allImageKeys.orEmpty().filter { it.isImportedPhoto() && it !in kept }.forEach(imageStore::delete)
                    _uiState.update { it.copy(isSaving = false, finished = true) }
                }
                .onFailure { error -> _uiState.update { it.copy(isSaving = false, error = error.message ?: "Couldn't save this item") } }
        }
    }

    fun delete() {
        val base = original ?: return
        if (_uiState.value.isSaving) return
        _uiState.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            repository.deleteProducts(setOf(base.id))
                .onSuccess {
                    saved = true
                    base.allImageKeys.filter { it.isImportedPhoto() }.forEach(imageStore::delete)
                    _uiState.update { it.copy(isSaving = false, finished = true) }
                }
                .onFailure { error -> _uiState.update { it.copy(isSaving = false, error = error.message ?: "Couldn't delete this item") } }
        }
    }

    override fun onCleared() {
        // Closed without saving: don't leave this edit's new photos behind on the phone.
        if (!saved) importedThisSession.forEach(imageStore::delete)
    }

    private fun fail(message: String) {
        _uiState.update { it.copy(error = message) }
    }

    companion object {
        const val NEW = "new"
        const val MAX_PHOTOS = 6
    }
}

private fun Double.toInputText(): String = if (this % 1.0 == 0.0) toLong().toString() else toString()
