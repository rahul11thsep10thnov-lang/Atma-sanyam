package com.wholesoul.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val mobileNumber: String = "",
    val otp: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val otpSentTo: String? = null,
    val loginSuccess: Boolean = false,
    val guestSuccess: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun onMobileNumberChange(value: String) {
        _uiState.value = _uiState.value.copy(mobileNumber = value.filter { it.isDigit() }.take(10), errorMessage = null)
    }

    fun onOtpChange(value: String) {
        _uiState.value = _uiState.value.copy(otp = value.filter { it.isDigit() }.take(4), errorMessage = null)
    }

    fun requestOtp(onOtpSent: (String) -> Unit) {
        val mobile = _uiState.value.mobileNumber
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            authRepository.requestOtp(mobile)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(isLoading = false, otpSentTo = mobile)
                    onOtpSent(mobile)
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = error.message)
                }
        }
    }

    fun verifyOtp(mobile: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            authRepository.verifyOtp(mobile, _uiState.value.otp)
                .onSuccess { _uiState.value = _uiState.value.copy(isLoading = false, loginSuccess = true) }
                .onFailure { error -> _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = error.message) }
        }
    }

    fun continueAsGuest() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            authRepository.continueAsGuest()
            _uiState.value = _uiState.value.copy(isLoading = false, guestSuccess = true)
        }
    }
}
