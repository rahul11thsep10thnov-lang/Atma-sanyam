package com.wholesoul.app.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.repository.CartRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/** Activity-scoped, so the cart badge in the bottom bar stays correct across every screen. */
@HiltViewModel
class RootViewModel @Inject constructor(
    cartRepository: CartRepository,
) : ViewModel() {
    val cartItemCount: StateFlow<Int> = cartRepository.cart
        .map { it.totalItemCount }
        .stateIn(viewModelScope, SharingStarted.Eagerly, 0)
}
