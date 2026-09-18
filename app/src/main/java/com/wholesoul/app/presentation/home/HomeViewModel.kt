package com.wholesoul.app.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.analytics.AnalyticsEvent
import com.wholesoul.app.core.analytics.AnalyticsLogger
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.Banner
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.AddressRepository
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.CategoryRepository
import com.wholesoul.app.domain.repository.ProductRepository
import com.wholesoul.app.domain.repository.observeQuantityMap
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeContent(
    val banners: List<Banner>,
    val categories: List<Category>,
    val freshToday: List<Product>,
    val bestPrices: List<Product>,
    val popular: List<Product>,
    val flowersAndPuja: List<Product>,
    val dailyEssentials: List<Product>,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val categoryRepository: CategoryRepository,
    private val cartRepository: CartRepository,
    private val addressRepository: AddressRepository,
    private val analyticsLogger: AnalyticsLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<HomeContent>>(UiState.Loading)
    val uiState: StateFlow<UiState<HomeContent>> = _uiState.asStateFlow()

    val cartQuantities: StateFlow<Map<String, Int>> = cartRepository.observeQuantityMap()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    val deliveryLabel: StateFlow<String> = addressRepository.addresses
        .map { addresses -> addresses.firstOrNull { it.isDefault } ?: addresses.firstOrNull() }
        .map { it?.let { addr -> "${addr.label.name.lowercase().replaceFirstChar(Char::uppercase)} • ${addr.oneLineSummary}" } ?: "Select delivery address" }
        .stateIn(viewModelScope, SharingStarted.Eagerly, "Select delivery address")

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            val categoriesDeferred = async { categoryRepository.getCategories() }
            val bannersDeferred = async { categoryRepository.getBanners() }
            val freshDeferred = async { productRepository.getFreshToday() }
            val bestPricesDeferred = async { productRepository.getBestPrices() }
            val popularDeferred = async { productRepository.getPopular() }
            val flowersDeferred = async { productRepository.getFlowersAndPuja() }
            val essentialsDeferred = async { productRepository.getDailyEssentials() }

            val categories = categoriesDeferred.await().getOrNull()
            val banners = bannersDeferred.await().getOrNull()

            if (categories == null || banners == null) {
                _uiState.value = UiState.Error("Unable to load the home page right now.")
                return@launch
            }

            _uiState.value = UiState.Success(
                HomeContent(
                    banners = banners,
                    categories = categories,
                    freshToday = freshDeferred.await().getOrDefault(emptyList()),
                    bestPrices = bestPricesDeferred.await().getOrDefault(emptyList()),
                    popular = popularDeferred.await().getOrDefault(emptyList()),
                    flowersAndPuja = flowersDeferred.await().getOrDefault(emptyList()),
                    dailyEssentials = essentialsDeferred.await().getOrDefault(emptyList()),
                ),
            )
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
        }
    }
}
