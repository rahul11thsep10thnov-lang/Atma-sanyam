package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.ServiceableArea

/**
 * PIN-code based delivery-area check (spec section 32). Deliberately has no GPS/geocoding
 * dependency — serviceability is decided from a configurable list of PIN codes only.
 */
interface ServiceabilityRepository {
    suspend fun checkPinCode(pinCode: String): Result<ServiceableArea>
    suspend fun getCountries(): List<String>
    suspend fun getStates(country: String): List<String>
    suspend fun getCities(state: String): List<String>
}
