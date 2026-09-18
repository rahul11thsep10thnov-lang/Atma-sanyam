package com.wholesoul.app.presentation.productdetails

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.analytics.AnalyticsEvent
import com.wholesoul.app.core.analytics.AnalyticsLogger
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.ProductRepository
import com.wholesoul.app.domain.repository.WishlistRepository
import com.wholesoul.app.domain.repository.observeQuantityMap
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductDetailsContent(
    val product: Product,
    val relatedProducts: List<Product>,
    val isWishlisted: Boolean,
)

@HiltViewModel
class ProductDetailsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val wishlistRepository: WishlistRepository,
    private val analyticsLogger: AnalyticsLogger,
) : ViewModel() {

    private val productId: String = checkNotNull(savedStateHandle["productId"])

    private val _uiState = MutableStateFlow<UiState<ProductDetailsContent>>(UiState.Loading)
    val uiState: StateFlow<UiState<ProductDetailsContent>> = _uiState.asStateFlow()

    val cartQuantities: StateFlow<Map<String, Int>> = cartRepository.observeQuantityMap()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            productRepository.getProductById(productId)
                .onSuccess { product ->
                    analyticsLogger.log(AnalyticsEvent.ProductViewed(product.id))
                    val related = productRepository.getRelatedProducts(product).getOrDefault(emptyList())
                    val wishlisted = wishlistRepository.isWishlisted(product.id)
                    _uiState.value = UiState.Success(ProductDetailsContent(product, related, wishlisted))
                }
                .onFailure { _uiState.value = UiState.Error(it.message ?: "This product is unavailable right now.") }
        }
    }

    fun addToCart(product: Product) {
        viewModelScope.launch {
            cartRepository.addToCart(product.id)
            analyticsLogger.log(AnalyticsEvent.ProductAddedToCart(product.id, 1))
        }
    }

    fun increment(productId: String) {
        viewModelScope.launch { cartRepository.addToCart(productId, 1) }
    }

    fun decrement(productId: String) {
        viewModelScope.launch {
            val current = cartRepository.quantityOf(productId)
            cartRepository.updateQuantity(productId, current - 1)
            if (current - 1 <= 0) analyticsLogger.log(AnalyticsEvent.ProductRemovedFromCart(productId))
        }
    }

    fun toggleWishlist(product: Product) {
        viewModelScope.launch {
            wishlistRepository.toggle(product.id)
            val nowWishlisted = wishlistRepository.isWishlisted(product.id)
            if (nowWishlisted) analyticsLogger.log(AnalyticsEvent.WishlistAdded(product.id))
            val current = _uiState.value
            if (current is UiState.Success) {
                _uiState.value = UiState.Success(current.data.copy(isWishlisted = nowWishlisted))
            }
        }
    }
}
