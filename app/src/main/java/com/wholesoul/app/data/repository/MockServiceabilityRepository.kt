package com.wholesoul.app.data.repository

import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.data.mock.MockLocationData
import com.wholesoul.app.domain.model.ServiceableArea
import com.wholesoul.app.domain.repository.ServiceabilityRepository
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockServiceabilityRepository @Inject constructor() : ServiceabilityRepository {

    override suspend fun checkPinCode(pinCode: String): Result<ServiceableArea> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        if (pinCode.length != 6 || pinCode.any { !it.isDigit() }) {
            return Result.failure(IllegalArgumentException("Enter a valid 6-digit PIN code"))
        }
        val area = MockLocationData.serviceableAreas.firstOrNull { it.pinCode == pinCode }
            ?: ServiceableArea(pinCode = pinCode, city = "", state = "", isServiceable = false, estimatedDeliveryLabel = "")
        return Result.success(area)
    }

    override suspend fun getCountries(): List<String> = MockLocationData.countries

    override suspend fun getStates(country: String): List<String> = MockLocationData.statesByCountry[country].orEmpty()

    override suspend fun getCities(state: String): List<String> = MockLocationData.citiesByState[state].orEmpty()
}
