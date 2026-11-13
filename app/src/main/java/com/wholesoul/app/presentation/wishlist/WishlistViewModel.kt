package com.wholesoul.app.presentation.wishlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.WishlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WishlistViewModel @Inject constructor(
    private val wishlistRepository: WishlistRepository,
    private val cartRepository: CartRepository,
) : ViewModel() {

    val wishlistProducts: StateFlow<List<Product>> = wishlistRepository.wishlistProducts
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun remove(productId: String) {
        viewModelScope.launch { wishlistRepository.remove(productId) }
    }

    fun addToCart(productId: String) {
        viewModelScope.launch { cartRepository.addToCart(productId) }
    }
}
