package com.wholesoul.app.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.image.isImportedPhoto
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.AdminAccess
import com.wholesoul.app.domain.repository.AdminCatalogRepository
import com.wholesoul.app.domain.repository.ImageStore
import com.wholesoul.app.domain.repository.MoveDirection
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AdminTab { ITEMS, CATEGORIES }

data class AdminHomeUiState(
    val isLoading: Boolean = true,
    val tab: AdminTab = AdminTab.ITEMS,
    val categories: List<Category> = emptyList(),
    val products: List<Product> = emptyList(),
    /** Null shows every category. */
    val categoryFilter: String? = null,
    val query: String = "",
    val selectedIds: Set<String> = emptySet(),
    val message: String? = null,
) {
    /** Items after the category chip and the search box are applied, in the admin's sequence. */
    val shownProducts: List<Product>
        get() {
            val q = query.trim()
            return products.filter { product ->
                (categoryFilter == null || product.categoryId == categoryFilter) &&
                    (q.isEmpty() || product.name.contains(q, ignoreCase = true) || product.brand.contains(q, ignoreCase = true))
            }
        }

    val isSelecting: Boolean get() = selectedIds.isNotEmpty()

    val allShownSelected: Boolean
        get() = shownProducts.isNotEmpty() && shownProducts.all { it.id in selectedIds }

    /** Item order only means something inside one category with no search narrowing the list. */
    val canReorderItems: Boolean get() = categoryFilter != null && query.isBlank()

    fun categoryName(id: String): String = categories.firstOrNull { it.id == id }?.displayName ?: "Unknown"
}

private data class LocalState(
    val tab: AdminTab = AdminTab.ITEMS,
    val categoryFilter: String? = null,
    val query: String = "",
    val selectedIds: Set<String> = emptySet(),
    val message: String? = null,
)

@HiltViewModel
class AdminHomeViewModel @Inject constructor(
    private val repository: AdminCatalogRepository,
    private val adminAccess: AdminAccess,
    private val imageStore: ImageStore,
) : ViewModel() {

    private val local = MutableStateFlow(LocalState())

    val uiState: StateFlow<AdminHomeUiState> = combine(
        repository.observeCategories(),
        repository.observeProducts(),
        local,
    ) { categories, products, state ->
        val existing = products.mapTo(HashSet()) { it.id }
        AdminHomeUiState(
            isLoading = false,
            tab = state.tab,
            categories = categories,
            products = products,
            // A filter on a category that has since been deleted falls back to "All".
            categoryFilter = state.categoryFilter?.takeIf { id -> categories.any { it.id == id } },
            query = state.query,
            // Items deleted elsewhere drop out of the selection.
            selectedIds = state.selectedIds.filterTo(HashSet()) { it in existing },
            message = state.message,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, AdminHomeUiState())

    fun selectTab(tab: AdminTab) = local.update { it.copy(tab = tab, selectedIds = emptySet()) }

    fun filterByCategory(categoryId: String?) = local.update { it.copy(categoryFilter = categoryId, selectedIds = emptySet()) }

    fun onQueryChange(query: String) = local.update { it.copy(query = query) }

    // --- selection ---

    fun toggleSelected(productId: String) = local.update {
        it.copy(selectedIds = if (productId in it.selectedIds) it.selectedIds - productId else it.selectedIds + productId)
    }

    /** Selects every item currently listed (respecting the category chip and search); tap again to clear. */
    fun toggleSelectAll() {
        val shown = uiState.value.shownProducts.map { it.id }
        local.update { state ->
            val allSelected = shown.isNotEmpty() && shown.all { it in state.selectedIds }
            state.copy(selectedIds = if (allSelected) state.selectedIds - shown.toSet() else state.selectedIds + shown)
        }
    }

    fun clearSelection() = local.update { it.copy(selectedIds = emptySet()) }

    // --- bulk actions ---

    fun showSelected() = bulk({ "Showing $it to customers" }) { ids -> repository.setProductsActive(ids, true) }

    fun hideSelected() = bulk({ "Hidden $it from customers" }) { ids -> repository.setProductsActive(ids, false) }

    fun moveSelectedTo(categoryId: String) {
        val name = uiState.value.categoryName(categoryId)
        bulk({ "Moved $it to $name" }) { ids -> repository.moveProductsToCategory(ids, categoryId) }
    }

    fun deleteSelected() {
        val state = uiState.value
        val ids = state.selectedIds
        if (ids.isEmpty()) return
        val photos = state.products.filter { it.id in ids }.flatMap { it.allImageKeys }.filter { it.isImportedPhoto() }
        bulk({ "Deleted $it" }) { chosen ->
            repository.deleteProducts(chosen).onSuccess { photos.forEach(imageStore::delete) }
        }
    }

    private fun bulk(done: (String) -> String, action: suspend (Set<String>) -> Result<Unit>) {
        val ids = uiState.value.selectedIds
        if (ids.isEmpty()) return
        viewModelScope.launch {
            action(ids)
                .onSuccess {
                    local.update { it.copy(selectedIds = emptySet(), message = done(itemCount(ids.size))) }
                }
                .onFailure { error -> local.update { it.copy(message = error.message ?: "That didn't work") } }
        }
    }

    // --- sequencing ---

    fun moveItem(productId: String, direction: MoveDirection) = write { repository.moveProduct(productId, direction) }

    fun moveCategory(categoryId: String, direction: MoveDirection) = write { repository.moveCategory(categoryId, direction) }

    private fun write(action: suspend () -> Result<Unit>) {
        viewModelScope.launch {
            action().onFailure { error -> local.update { it.copy(message = error.message ?: "That didn't work") } }
        }
    }

    fun consumeMessage() = local.update { it.copy(message = null) }

    fun lock() = adminAccess.lock()

    private fun itemCount(count: Int) = if (count == 1) "1 item" else "$count items"
}
