package com.wholesoul.app.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.repository.AdminAccess
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class GateMode { CHECKING, CREATE_PIN, ENTER_PIN }

data class AdminGateUiState(
    val mode: GateMode = GateMode.CHECKING,
    val pin: String = "",
    val confirmPin: String = "",
    val error: String? = null,
    val isBusy: Boolean = false,
)

/** Drives the PIN screen in front of every Admin Console page. */
@HiltViewModel
class AdminGateViewModel @Inject constructor(
    private val adminAccess: AdminAccess,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminGateUiState())
    val uiState: StateFlow<AdminGateUiState> = _uiState.asStateFlow()

    val isUnlocked: StateFlow<Boolean> = adminAccess.isUnlocked
        .stateIn(viewModelScope, SharingStarted.Eagerly, adminAccess.isUnlocked.value)

    init {
        viewModelScope.launch {
            val mode = if (adminAccess.hasPin()) GateMode.ENTER_PIN else GateMode.CREATE_PIN
            _uiState.value = _uiState.value.copy(mode = mode)
        }
    }

    fun onPinChange(value: String) {
        _uiState.value = _uiState.value.copy(pin = value.filter { it.isDigit() }.take(MAX_PIN), error = null)
    }

    fun onConfirmPinChange(value: String) {
        _uiState.value = _uiState.value.copy(confirmPin = value.filter { it.isDigit() }.take(MAX_PIN), error = null)
    }

    fun submit() {
        val state = _uiState.value
        if (state.isBusy) return
        when (state.mode) {
            GateMode.CHECKING -> Unit
            GateMode.CREATE_PIN -> {
                if (state.pin.length < MIN_PIN) return fail("Choose a PIN of $MIN_PIN to $MAX_PIN digits")
                if (state.pin != state.confirmPin) return fail("The two PINs don't match")
                run { adminAccess.setPin(state.pin).onFailure { fail(it.message ?: "Couldn't save the PIN") } }
            }
            GateMode.ENTER_PIN -> run {
                if (!adminAccess.unlock(state.pin)) {
                    _uiState.value = _uiState.value.copy(pin = "", error = "Wrong PIN")
                }
            }
        }
    }

    private fun run(block: suspend () -> Unit) {
        _uiState.value = _uiState.value.copy(isBusy = true)
        viewModelScope.launch {
            try {
                block()
            } finally {
                _uiState.value = _uiState.value.copy(isBusy = false)
            }
        }
    }

    private fun fail(message: String) {
        _uiState.value = _uiState.value.copy(error = message)
    }

    fun lock() = adminAccess.lock()

    companion object {
        const val MIN_PIN = 4
        const val MAX_PIN = 8
    }
}
