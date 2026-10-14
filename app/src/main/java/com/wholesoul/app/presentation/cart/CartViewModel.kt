package com.wholesoul.app.presentation.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.analytics.AnalyticsEvent
import com.wholesoul.app.core.analytics.AnalyticsLogger
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.CouponRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CartUiState(
    val cart: Cart = Cart(emptyList()),
    val totals: CartTotals = CartTotals(0.0, 0.0, 0.0, 0.0, 0.0, 299.0),
    val couponError: String? = null,
    val couponInput: String = "",
    val isApplyingCoupon: Boolean = false,
)

@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val couponRepository: CouponRepository,
    private val analyticsLogger: AnalyticsLogger,
) : ViewModel() {

    private val couponError = MutableStateFlow<String?>(null)
    private val couponInput = MutableStateFlow("")
    private val isApplyingCoupon = MutableStateFlow(false)

    val uiState: StateFlow<CartUiState> = combine(
        cartRepository.cart,
        couponError,
        couponInput,
        isApplyingCoupon,
    ) { cart, error, input, applying ->
        CartUiState(
            cart = cart,
            totals = cartRepository.computeTotals(cart),
            couponError = error,
            couponInput = input,
            isApplyingCoupon = applying,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, CartUiState())

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

    fun remove(productId: String) {
        viewModelScope.launch {
            cartRepository.removeFromCart(productId)
            analyticsLogger.log(AnalyticsEvent.ProductRemovedFromCart(productId))
        }
    }

    fun onCouponInputChange(value: String) {
        couponInput.value = value.uppercase()
        couponError.value = null
    }

    fun applyCoupon() {
        val code = couponInput.value.trim()
        if (code.isBlank()) return
        viewModelScope.launch {
            isApplyingCoupon.value = true
            val itemTotal = uiState.value.totals.itemTotal
            couponRepository.validateCoupon(code, itemTotal)
                .onSuccess { coupon ->
                    cartRepository.applyCoupon(coupon)
                    analyticsLogger.log(AnalyticsEvent.CouponApplied(coupon.code))
                    couponInput.value = ""
                }
                .onFailure { couponError.value = it.message }
            isApplyingCoupon.value = false
        }
    }

    fun removeCoupon() {
        viewModelScope.launch { cartRepository.removeCoupon() }
    }
}
