package com.wholesoul.app.presentation.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.model.DeliveryStatus
import com.wholesoul.app.domain.model.Order
import com.wholesoul.app.domain.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

enum class OrderTab { ACTIVE, COMPLETED, CANCELLED }

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
) : ViewModel() {

    val orders: StateFlow<List<Order>> = orderRepository.orders
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())
}

fun List<Order>.filterByTab(tab: OrderTab): List<Order> = when (tab) {
    OrderTab.ACTIVE -> filter { it.isActive }
    OrderTab.COMPLETED -> filter { it.status == DeliveryStatus.DELIVERED }
    OrderTab.CANCELLED -> filter { it.status == DeliveryStatus.CANCELLED }
}
