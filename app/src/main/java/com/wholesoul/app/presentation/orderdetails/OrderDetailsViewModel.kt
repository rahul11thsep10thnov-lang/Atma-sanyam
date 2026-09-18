package com.wholesoul.app.presentation.orderdetails

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Order
import com.wholesoul.app.domain.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OrderDetailsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val orderId: String = checkNotNull(savedStateHandle["orderId"])

    private val _uiState = MutableStateFlow<UiState<Order>>(UiState.Loading)
    val uiState: StateFlow<UiState<Order>> = _uiState.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            orderRepository.getOrderById(orderId)
                .onSuccess { _uiState.value = UiState.Success(it) }
                .onFailure { _uiState.value = UiState.Error(it.message ?: "Order not found") }
        }
    }

    fun cancelOrder() {
        viewModelScope.launch {
            orderRepository.cancelOrder(orderId)
                .onSuccess { load() }
                .onFailure { _actionMessage.value = it.message }
        }
    }

    fun reorder() {
        viewModelScope.launch {
            orderRepository.reorder(orderId)
                .onSuccess { _actionMessage.value = "Items added to your cart" }
                .onFailure { _actionMessage.value = it.message }
        }
    }

    fun clearActionMessage() { _actionMessage.value = null }
}
