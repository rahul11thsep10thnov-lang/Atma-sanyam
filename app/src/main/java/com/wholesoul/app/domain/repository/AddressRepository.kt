package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Address
import kotlinx.coroutines.flow.Flow

interface AddressRepository {
    val addresses: Flow<List<Address>>

    suspend fun addAddress(address: Address)
    suspend fun updateAddress(address: Address)
    suspend fun deleteAddress(addressId: String)
    suspend fun setDefault(addressId: String)
    suspend fun getDefaultAddress(): Address?
}
