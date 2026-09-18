package com.wholesoul.app.presentation.search

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.analytics.AnalyticsEvent
import com.wholesoul.app.core.analytics.AnalyticsLogger
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.data.local.SessionPreferenceKeys
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.ProductRepository
import com.wholesoul.app.domain.repository.observeQuantityMap
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject

val POPULAR_SEARCHES = listOf("Tomato", "Potato", "Onion", "Rose", "Marigold", "Mango", "Garland", "Puja flowers", "Milk", "Banana")

data class SearchUiState(
    val query: String = "",
    val recentSearches: List<String> = emptyList(),
    val results: UiState<List<Product>>? = null,
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val dataStore: DataStore<Preferences>,
    private val analyticsLogger: AnalyticsLogger,
) : ViewModel() {

    private val json = Json { ignoreUnknownKeys = true }
    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    val cartQuantities: StateFlow<Map<String, Int>> = cartRepository.observeQuantityMap()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            val stored = dataStore.data.first()[SessionPreferenceKeys.RECENT_SEARCHES]
            val recents = stored?.let { runCatching { json.decodeFromString<List<String>>(it) }.getOrNull() } ?: emptyList()
            _uiState.value = _uiState.value.copy(recentSearches = recents)
        }
    }

    fun onQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
        searchJob?.cancel()
        if (query.isBlank()) {
            _uiState.value = _uiState.value.copy(results = null)
            return
        }
        searchJob = viewModelScope.launch {
            delay(300L)
            _uiState.value = _uiState.value.copy(results = UiState.Loading)
            productRepository.searchProducts(query)
                .onSuccess { list ->
                    _uiState.value = _uiState.value.copy(
                        results = if (list.isEmpty()) UiState.Empty("Oops! We couldn't find that.") else UiState.Success(list),
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(results = UiState.Error(it.message ?: "Something went wrong")) }
        }
    }

    fun onSearchSubmitted(query: String) {
        if (query.isBlank()) return
        analyticsLogger.log(AnalyticsEvent.SearchPerformed(query))
        viewModelScope.launch {
            val updated = (listOf(query) + _uiState.value.recentSearches.filterNot { it.equals(query, true) }).take(8)
            _uiState.value = _uiState.value.copy(recentSearches = updated)
            dataStore.edit { it[SessionPreferenceKeys.RECENT_SEARCHES] = json.encodeToString(updated) }
        }
    }

    fun clearRecentSearches() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(recentSearches = emptyList())
            dataStore.edit { it[SessionPreferenceKeys.RECENT_SEARCHES] = json.encodeToString(emptyList<String>()) }
        }
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
