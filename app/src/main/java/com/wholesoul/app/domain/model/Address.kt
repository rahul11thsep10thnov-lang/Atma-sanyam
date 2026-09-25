package com.wholesoul.app.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class AddressLabel { HOME, OFFICE, OTHER }

/**
 * Fully manual delivery address. No coordinates, no GPS fields —
 * WHOLESOUL never reads or stores device location.
 */
@Serializable
data class Address(
    val id: String,
    val label: AddressLabel,
    val fullName: String,
    val mobileNumber: String,
    val houseNumber: String,
    val buildingStreet: String,
    val landmark: String,
    val area: String,
    val city: String,
    val state: String,
    val country: String = "India",
    val pinCode: String,
    val isDefault: Boolean = false,
) {
    val oneLineSummary: String
        get() = "$area, $city"
}
