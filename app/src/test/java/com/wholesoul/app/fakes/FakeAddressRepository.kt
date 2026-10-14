package com.wholesoul.app.fakes

import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.repository.AddressRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class FakeAddressRepository : AddressRepository {
    private val state = MutableStateFlow<List<Address>>(emptyList())
    override val addresses: StateFlow<List<Address>> get() = state

    override suspend fun addAddress(address: Address) {
        val isFirst = state.value.isEmpty()
        state.value = state.value + address.copy(isDefault = address.isDefault || isFirst)
    }

    override suspend fun updateAddress(address: Address) {
        state.value = state.value.map { if (it.id == address.id) address else it }
    }

    override suspend fun deleteAddress(addressId: String) {
        state.value = state.value.filterNot { it.id == addressId }
    }

    override suspend fun setDefault(addressId: String) {
        state.value = state.value.map { it.copy(isDefault = it.id == addressId) }
    }

    override suspend fun getDefaultAddress(): Address? = state.value.firstOrNull { it.isDefault }
}
