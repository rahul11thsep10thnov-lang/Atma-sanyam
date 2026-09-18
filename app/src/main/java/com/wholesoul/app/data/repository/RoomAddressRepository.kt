package com.wholesoul.app.data.repository

import com.wholesoul.app.data.local.dao.AddressDao
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.data.local.entity.toEntity
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.repository.AddressRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomAddressRepository @Inject constructor(
    private val addressDao: AddressDao,
) : AddressRepository {

    override val addresses: Flow<List<Address>> = addressDao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun addAddress(address: Address) {
        val isFirst = addressDao.count() == 0
        addressDao.insert(address.copy(isDefault = address.isDefault || isFirst).toEntity())
    }

    override suspend fun updateAddress(address: Address) {
        addressDao.update(address.toEntity())
    }

    override suspend fun deleteAddress(addressId: String) {
        addressDao.delete(addressId)
    }

    override suspend fun setDefault(addressId: String) {
        addressDao.clearDefault()
        addressDao.setDefault(addressId)
    }

    override suspend fun getDefaultAddress(): Address? = addressDao.getDefault()?.toDomain()
}
