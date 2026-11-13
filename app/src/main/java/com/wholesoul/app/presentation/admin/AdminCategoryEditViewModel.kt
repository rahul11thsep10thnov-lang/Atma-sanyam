package com.wholesoul.app.presentation.admin

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.image.isImportedPhoto
import com.wholesoul.app.core.util.toSlug
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.repository.AdminCatalogRepository
import com.wholesoul.app.domain.repository.ImageStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class CategoryForm(
    val name: String = "",
    /** Empty means "no photo chosen"; customers then see a plain placeholder. */
    val photo: String = "",
    val isVisible: Boolean = true,
)

data class CategoryEditUiState(
    val isLoading: Boolean = true,
    val isNew: Boolean = true,
    val notFound: Boolean = false,
    val itemCount: Int = 0,
    val form: CategoryForm = CategoryForm(),
    val isImportingPhoto: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val finished: Boolean = false,
)

@HiltViewModel
class AdminCategoryEditViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: AdminCatalogRepository,
    private val imageStore: ImageStore,
) : ViewModel() {

    private val categoryId: String? = savedStateHandle.get<String>("categoryId")?.takeIf { it != NEW }

    private val _uiState = MutableStateFlow(CategoryEditUiState(isNew = categoryId == null))
    val uiState: StateFlow<CategoryEditUiState> = _uiState.asStateFlow()

    private var original: Category? = null
    private val importedThisSession = mutableSetOf<String>()
    private var saved = false

    init {
        viewModelScope.launch {
            if (categoryId == null) {
                _uiState.update { it.copy(isLoading = false) }
                return@launch
            }
            val category = repository.getCategory(categoryId)
            if (category == null) {
                _uiState.update { it.copy(isLoading = false, notFound = true) }
                return@launch
            }
            original = category
            _uiState.update {
                it.copy(
                    isLoading = false,
                    itemCount = category.productCount,
                    form = CategoryForm(
                        name = category.displayName,
                        photo = category.imageKey.takeIf { key -> key.isImportedPhoto() }.orEmpty(),
                        isVisible = category.isActive,
                    ),
                )
            }
        }
    }

    fun onNameChange(value: String) {
        _uiState.update { it.copy(form = it.form.copy(name = value), error = null) }
    }

    fun onVisibleChange(value: Boolean) {
        _uiState.update { it.copy(form = it.form.copy(isVisible = value), error = null) }
    }

    fun setPhoto(uri: String) {
        _uiState.update { it.copy(isImportingPhoto = true, error = null) }
        viewModelScope.launch {
            imageStore.importPhoto(uri)
                .onSuccess { key ->
                    importedThisSession += key
                    val previous = _uiState.value.form.photo
                    // Replacing a photo picked earlier in this same edit: the old one was never saved.
                    if (importedThisSession.remove(previous)) imageStore.delete(previous)
                    _uiState.update { it.copy(isImportingPhoto = false, form = it.form.copy(photo = key)) }
                }
                .onFailure { _uiState.update { it.copy(isImportingPhoto = false, error = "Couldn't use that photo") } }
        }
    }

    fun removePhoto() {
        val previous = _uiState.value.form.photo
        _uiState.update { it.copy(form = it.form.copy(photo = "")) }
        if (importedThisSession.remove(previous)) imageStore.delete(previous)
    }

    fun save() {
        val state = _uiState.value
        if (state.isSaving || state.isImportingPhoto) return
        val name = state.form.name.trim()
        if (name.isEmpty()) return fail("Enter the category name")
        _uiState.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            val base = original
            val id = base?.id ?: newId(name)
            val imageKey = state.form.photo.ifEmpty { base?.imageKey?.takeUnless { it.isImportedPhoto() } ?: "categories/$id" }
            val category = Category(
                id = id,
                displayName = name,
                imageKey = imageKey,
                productCount = base?.productCount ?: 0,
                sortOrder = base?.sortOrder ?: 0,
                isActive = state.form.isVisible,
            )
            repository.saveCategory(category)
                .onSuccess {
                    saved = true
                    val old = base?.imageKey
                    if (old != null && old.isImportedPhoto() && old != imageKey) imageStore.delete(old)
                    _uiState.update { it.copy(isSaving = false, finished = true) }
                }
                .onFailure { error -> _uiState.update { it.copy(isSaving = false, error = error.message ?: "Couldn't save this category") } }
        }
    }

    fun delete() {
        val base = original ?: return
        if (_uiState.value.isSaving) return
        _uiState.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            repository.deleteCategory(base.id)
                .onSuccess {
                    saved = true
                    if (base.imageKey.isImportedPhoto()) imageStore.delete(base.imageKey)
                    _uiState.update { it.copy(isSaving = false, finished = true) }
                }
                .onFailure { error -> _uiState.update { it.copy(isSaving = false, error = error.message ?: "Couldn't delete this category") } }
        }
    }

    /** A readable, URL-safe id from the name; falls back to a random one for names with no Latin letters. */
    private suspend fun newId(name: String): String {
        val base = name.toSlug().ifEmpty { "category-${UUID.randomUUID().toString().take(8)}" }
        var candidate = base
        var suffix = 2
        while (repository.getCategory(candidate) != null) candidate = "$base-${suffix++}"
        return candidate
    }

    override fun onCleared() {
        if (!saved) importedThisSession.forEach(imageStore::delete)
    }

    private fun fail(message: String) {
        _uiState.update { it.copy(error = message) }
    }

    companion object {
        const val NEW = "new"
    }
}
