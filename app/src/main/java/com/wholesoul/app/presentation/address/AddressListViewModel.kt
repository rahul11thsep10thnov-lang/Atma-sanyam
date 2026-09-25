package com.wholesoul.app.presentation.address

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.repository.AddressRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AddressListViewModel @Inject constructor(
    private val addressRepository: AddressRepository,
) : ViewModel() {

    val addresses: StateFlow<List<Address>> = addressRepository.addresses
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun setDefault(addressId: String) {
        viewModelScope.launch { addressRepository.setDefault(addressId) }
    }

    fun delete(addressId: String) {
        viewModelScope.launch { addressRepository.deleteAddress(addressId) }
    }
}
