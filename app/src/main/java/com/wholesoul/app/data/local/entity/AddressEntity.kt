package com.wholesoul.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.AddressLabel

@Entity(tableName = "addresses")
data class AddressEntity(
    @PrimaryKey val id: String,
    val label: String,
    val fullName: String,
    val mobileNumber: String,
    val houseNumber: String,
    val buildingStreet: String,
    val landmark: String,
    val area: String,
    val city: String,
    val state: String,
    val country: String,
    val pinCode: String,
    val isDefault: Boolean,
)

fun AddressEntity.toDomain() = Address(
    id = id,
    label = runCatching { AddressLabel.valueOf(label) }.getOrDefault(AddressLabel.OTHER),
    fullName = fullName,
    mobileNumber = mobileNumber,
    houseNumber = houseNumber,
    buildingStreet = buildingStreet,
    landmark = landmark,
    area = area,
    city = city,
    state = state,
    country = country,
    pinCode = pinCode,
    isDefault = isDefault,
)

fun Address.toEntity() = AddressEntity(
    id = id,
    label = label.name,
    fullName = fullName,
    mobileNumber = mobileNumber,
    houseNumber = houseNumber,
    buildingStreet = buildingStreet,
    landmark = landmark,
    area = area,
    city = city,
    state = state,
    country = country,
    pinCode = pinCode,
    isDefault = isDefault,
)
