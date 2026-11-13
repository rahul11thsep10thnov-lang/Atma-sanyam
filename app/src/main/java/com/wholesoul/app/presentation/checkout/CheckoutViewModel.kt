package com.wholesoul.app.presentation.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.analytics.AnalyticsEvent
import com.wholesoul.app.core.analytics.AnalyticsLogger
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.PaymentMethod
import com.wholesoul.app.domain.repository.AddressRepository
import com.wholesoul.app.domain.repository.CartRepository
import com.wholesoul.app.domain.repository.OrderRepository
import com.wholesoul.app.domain.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CheckoutUiState(
    val cart: Cart = Cart(emptyList()),
    val totals: CartTotals = CartTotals(0.0, 0.0, 0.0, 0.0, 0.0, 299.0),
    val addresses: List<Address> = emptyList(),
    val selectedAddress: Address? = null,
    val paymentMethod: PaymentMethod = PaymentMethod.UPI,
    val deliveryInstructions: String = "",
    val isPlacingOrder: Boolean = false,
    val errorMessage: String? = null,
    val placedOrderId: String? = null,
)

private data class FormInputs(
    val cart: Cart,
    val addresses: List<Address>,
    val selectedAddressId: String?,
    val paymentMethod: PaymentMethod,
    val deliveryInstructions: String,
)

private data class TransientFlags(
    val isPlacingOrder: Boolean,
    val errorMessage: String?,
    val placedOrderId: String?,
)

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val addressRepository: AddressRepository,
    private val orderRepository: OrderRepository,
    private val paymentRepository: PaymentRepository,
    private val analyticsLogger: AnalyticsLogger,
) : ViewModel() {

    private val paymentMethod = MutableStateFlow(PaymentMethod.UPI)
    private val deliveryInstructions = MutableStateFlow("")
    private val selectedAddressId = MutableStateFlow<String?>(null)
    private val isPlacingOrder = MutableStateFlow(false)
    private val errorMessage = MutableStateFlow<String?>(null)
    private val placedOrderId = MutableStateFlow<String?>(null)

    private val formInputs = combine(
        cartRepository.cart,
        addressRepository.addresses,
        selectedAddressId,
        paymentMethod,
        deliveryInstructions,
    ) { cart, addresses, selectedId, method, instructions ->
        FormInputs(cart, addresses, selectedId, method, instructions)
    }

    private val transientFlags = combine(isPlacingOrder, errorMessage, placedOrderId) { placing, error, orderId ->
        TransientFlags(placing, error, orderId)
    }

    val uiState: StateFlow<CheckoutUiState> = combine(formInputs, transientFlags) { inputs, flags ->
        val selected = inputs.addresses.firstOrNull { it.id == inputs.selectedAddressId }
            ?: inputs.addresses.firstOrNull { it.isDefault }
            ?: inputs.addresses.firstOrNull()
        CheckoutUiState(
            cart = inputs.cart,
            totals = cartRepository.computeTotals(inputs.cart),
            addresses = inputs.addresses,
            selectedAddress = selected,
            paymentMethod = inputs.paymentMethod,
            deliveryInstructions = inputs.deliveryInstructions,
            isPlacingOrder = flags.isPlacingOrder,
            errorMessage = flags.errorMessage,
            placedOrderId = flags.placedOrderId,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, CheckoutUiState())

    init {
        analyticsLogger.log(AnalyticsEvent.CheckoutStarted)
    }

    fun selectAddress(addressId: String) { selectedAddressId.value = addressId }
    fun selectPaymentMethod(method: PaymentMethod) { paymentMethod.value = method }
    fun onDeliveryInstructionsChange(value: String) { deliveryInstructions.value = value }

    fun placeOrder() {
        val state = uiState.value
        val address = state.selectedAddress
        if (address == null) {
            errorMessage.value = "Please select a delivery address"
            return
        }
        if (state.cart.isEmpty) {
            errorMessage.value = "Your cart is empty"
            return
        }
        viewModelScope.launch {
            isPlacingOrder.value = true
            errorMessage.value = null
            analyticsLogger.log(AnalyticsEvent.PaymentInitiated(state.paymentMethod.label))

            orderRepository.placeOrder(state.cart, state.totals, address, state.paymentMethod, state.deliveryInstructions)
                .onSuccess { order ->
                    paymentRepository.pay(order.id, order.grandTotal, state.paymentMethod)
                    analyticsLogger.log(AnalyticsEvent.OrderPlaced(order.id, order.grandTotal))
                    order.items.forEach { analyticsLogger.log(AnalyticsEvent.ProductPurchased(it.productId)) }
                    isPlacingOrder.value = false
                    placedOrderId.value = order.id
                }
                .onFailure {
                    isPlacingOrder.value = false
                    errorMessage.value = it.message ?: "Unable to place order. Please try again."
                }
        }
    }
}
