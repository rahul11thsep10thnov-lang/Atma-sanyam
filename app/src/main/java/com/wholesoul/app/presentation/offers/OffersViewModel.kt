package com.wholesoul.app.presentation.offers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Offer
import com.wholesoul.app.domain.repository.CouponRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OffersViewModel @Inject constructor(
    private val couponRepository: CouponRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<List<Offer>>>(UiState.Loading)
    val uiState: StateFlow<UiState<List<Offer>>> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            couponRepository.getOffers()
                .onSuccess { _uiState.value = if (it.isEmpty()) UiState.Empty("No offers right now") else UiState.Success(it) }
                .onFailure { _uiState.value = UiState.Error(it.message ?: "Something went wrong") }
        }
    }
}
