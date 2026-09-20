package com.atmasanyam.app.ui.location

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.atmasanyam.app.data.repository.CatalogRepository
import com.atmasanyam.app.data.repository.PreferencesRepository
import com.atmasanyam.app.domain.model.IndianState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LocationFilterUiState(
    val states: List<IndianState> = emptyList(),
    val districts: List<String> = emptyList(),
    val selectedState: String? = null,
    val selectedDistrict: String? = null,
    val isLoadingStates: Boolean = true,
    val isLoadingDistricts: Boolean = false,
    val saved: Boolean = false,
)

/** India -> State -> District picker. No GPS/location permission is ever requested (spec §20/§21). */
@HiltViewModel
class LocationFilterViewModel @Inject constructor(
    private val catalogRepository: CatalogRepository,
    private val preferencesRepository: PreferencesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LocationFilterUiState())
    val uiState: StateFlow<LocationFilterUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val states = runCatching { catalogRepository.getStates() }.getOrDefault(emptyList())
            val currentState = preferencesRepository.selectedState.first()
            val currentDistrict = preferencesRepository.selectedDistrict.first()
            _uiState.value = _uiState.value.copy(
                states = states,
                selectedState = currentState,
                selectedDistrict = currentDistrict,
                isLoadingStates = false,
            )
            if (currentState != null) loadDistricts(currentState)
        }
    }

    fun selectAllIndia() {
        _uiState.value = _uiState.value.copy(selectedState = null, selectedDistrict = null, districts = emptyList())
        save()
    }

    fun selectState(state: String) {
        _uiState.value = _uiState.value.copy(selectedState = state, selectedDistrict = null)
        loadDistricts(state)
    }

    fun selectDistrict(district: String?) {
        _uiState.value = _uiState.value.copy(selectedDistrict = district)
        save()
    }

    private fun loadDistricts(state: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingDistricts = true)
            val districts = runCatching { catalogRepository.getDistricts(state) }.getOrDefault(emptyList())
            _uiState.value = _uiState.value.copy(districts = districts, isLoadingDistricts = false)
        }
    }

    fun save() {
        viewModelScope.launch {
            preferencesRepository.setSelectedLocation(_uiState.value.selectedState, _uiState.value.selectedDistrict)
            _uiState.value = _uiState.value.copy(saved = true)
        }
    }
}
