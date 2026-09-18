package com.wholesoul.app.presentation.productlisting

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.model.ProductCategory
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.ProductFilter
import com.wholesoul.app.domain.repository.ProductRepository
import com.wholesoul.app.domain.repository.SortOption
import com.wholesoul.app.domain.repository.observeQuantityMap
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductListingUiState(
    val category: ProductCategory,
    val isGridView: Boolean = true,
    val filter: ProductFilter = ProductFilter(),
    val products: UiState<List<Product>> = UiState.Loading,
)

@HiltViewModel
class ProductListingViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val category = ProductCategory.valueOf(
        savedStateHandle.get<String>("categoryName") ?: ProductCategory.FRUITS.name,
    )

    private val _uiState = MutableStateFlow(ProductListingUiState(category = category))
    val uiState: StateFlow<ProductListingUiState> = _uiState.asStateFlow()

    val cartQuantities: StateFlow<Map<String, Int>> = cartRepository.observeQuantityMap()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(products = UiState.Loading)
            productRepository.getProductsByCategory(category, _uiState.value.filter)
                .onSuccess { list ->
                    _uiState.value = _uiState.value.copy(
                        products = if (list.isEmpty()) UiState.Empty("No products match your filters") else UiState.Success(list),
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(products = UiState.Error(it.message ?: "Something went wrong")) }
        }
    }

    fun toggleView() {
        _uiState.value = _uiState.value.copy(isGridView = !_uiState.value.isGridView)
    }

    fun updateSort(sortOption: SortOption) {
        _uiState.value = _uiState.value.copy(filter = _uiState.value.filter.copy(sortOption = sortOption))
        load()
    }

    fun updateFilter(filter: ProductFilter) {
        _uiState.value = _uiState.value.copy(filter = filter)
        load()
    }

    fun addToCart(product: Product) {
        viewModelScope.launch { cartRepository.addToCart(product.id) }
    }

    fun increment(productId: String) {
        viewModelScope.launch { cartRepository.addToCart(productId, 1) }
    }

    fun decrement(productId: String) {
        viewModelScope.launch {
            val current = cartRepository.quantityOf(productId)
            cartRepository.updateQuantity(productId, current - 1)
        }
    }
}
