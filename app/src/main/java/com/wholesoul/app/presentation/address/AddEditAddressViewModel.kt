package com.wholesoul.app.presentation.address

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.AddressLabel
import com.wholesoul.app.domain.repository.AddressRepository
import com.wholesoul.app.domain.repository.ServiceabilityRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class AddressFormState(
    val addressId: String? = null,
    val label: AddressLabel = AddressLabel.HOME,
    val fullName: String = "",
    val mobileNumber: String = "",
    val houseNumber: String = "",
    val buildingStreet: String = "",
    val landmark: String = "",
    val country: String = "India",
    val state: String = "",
    val city: String = "",
    val area: String = "",
    val pinCode: String = "",
    val countries: List<String> = listOf("India"),
    val states: List<String> = emptyList(),
    val cities: List<String> = emptyList(),
    val serviceabilityMessage: String? = null,
    val isServiceable: Boolean? = null,
    val isCheckingPin: Boolean = false,
    val isSaving: Boolean = false,
    val saved: Boolean = false,
) {
    val isValid: Boolean
        get() = fullName.isNotBlank() && mobileNumber.length == 10 && houseNumber.isNotBlank() &&
            buildingStreet.isNotBlank() && area.isNotBlank() && city.isNotBlank() && state.isNotBlank() &&
            pinCode.length == 6
}

@HiltViewModel
class AddEditAddressViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val addressRepository: AddressRepository,
    private val serviceabilityRepository: ServiceabilityRepository,
) : ViewModel() {

    private val existingAddressId: String? = savedStateHandle["addressId"]

    private val _formState = MutableStateFlow(AddressFormState(addressId = existingAddressId))
    val formState: StateFlow<AddressFormState> = _formState.asStateFlow()

    init {
        viewModelScope.launch {
            val countries = serviceabilityRepository.getCountries()
            val states = serviceabilityRepository.getStates(countries.first())
            _formState.value = _formState.value.copy(countries = countries, states = states)

            existingAddressId?.let { id ->
                val existing = addressRepository.addresses.first().firstOrNull { it.id == id } ?: return@let
                val cities = serviceabilityRepository.getCities(existing.state)
                _formState.value = _formState.value.copy(
                    label = existing.label,
                    fullName = existing.fullName,
                    mobileNumber = existing.mobileNumber,
                    houseNumber = existing.houseNumber,
                    buildingStreet = existing.buildingStreet,
                    landmark = existing.landmark,
                    country = existing.country,
                    state = existing.state,
                    city = existing.city,
                    area = existing.area,
                    pinCode = existing.pinCode,
                    cities = cities,
                )
            }
        }
    }

    fun onLabelChange(label: AddressLabel) { update { it.copy(label = label) } }
    fun onFullNameChange(value: String) { update { it.copy(fullName = value) } }
    fun onMobileChange(value: String) { update { it.copy(mobileNumber = value.filter(Char::isDigit).take(10)) } }
    fun onHouseNumberChange(value: String) { update { it.copy(houseNumber = value) } }
    fun onBuildingStreetChange(value: String) { update { it.copy(buildingStreet = value) } }
    fun onLandmarkChange(value: String) { update { it.copy(landmark = value) } }
    fun onAreaChange(value: String) { update { it.copy(area = value) } }

    fun onStateChange(state: String) {
        update { it.copy(state = state, city = "", cities = emptyList()) }
        viewModelScope.launch {
            val cities = serviceabilityRepository.getCities(state)
            update { it.copy(cities = cities) }
        }
    }

    fun onCityChange(city: String) { update { it.copy(city = city) } }

    fun onPinCodeChange(value: String) {
        val digits = value.filter(Char::isDigit).take(6)
        update { it.copy(pinCode = digits, serviceabilityMessage = null, isServiceable = null) }
        if (digits.length == 6) {
            viewModelScope.launch {
                update { it.copy(isCheckingPin = true) }
                serviceabilityRepository.checkPinCode(digits)
                    .onSuccess { area ->
                        update {
                            it.copy(
                                isCheckingPin = false,
                                isServiceable = area.isServiceable,
                                serviceabilityMessage = if (area.isServiceable) {
                                    "Great! We deliver here. ${area.estimatedDeliveryLabel}"
                                } else {
                                    "We're coming soon to this area."
                                },
                            )
                        }
                    }
                    .onFailure { error ->
                        update { it.copy(isCheckingPin = false, serviceabilityMessage = error.message ?: "Invalid PIN code") }
                    }
            }
        }
    }

    fun save() {
        val state = _formState.value
        if (!state.isValid) return
        viewModelScope.launch {
            update { it.copy(isSaving = true) }
            val address = Address(
                id = state.addressId ?: UUID.randomUUID().toString(),
                label = state.label,
                fullName = state.fullName,
                mobileNumber = state.mobileNumber,
                houseNumber = state.houseNumber,
                buildingStreet = state.buildingStreet,
                landmark = state.landmark,
                area = state.area,
                city = state.city,
                state = state.state,
                country = state.country,
                pinCode = state.pinCode,
            )
            if (state.addressId != null) {
                addressRepository.updateAddress(address)
            } else {
                addressRepository.addAddress(address)
            }
            update { it.copy(isSaving = false, saved = true) }
        }
    }

    private inline fun update(block: (AddressFormState) -> AddressFormState) {
        _formState.value = block(_formState.value)
    }
}
