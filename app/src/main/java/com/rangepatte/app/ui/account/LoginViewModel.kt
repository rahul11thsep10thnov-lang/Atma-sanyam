package com.rangepatte.app.ui.account

import android.app.Activity
import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.data.auth.AccountRepository
import com.rangepatte.app.data.auth.OtpRequestResult
import com.rangepatte.app.data.membership.MembershipRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class LoginStep { ENTER_PHONE, ENTER_OTP }

data class LoginUiState(
    val step: LoginStep = LoginStep.ENTER_PHONE,
    /** The 10-digit Indian mobile number, without +91. */
    val phoneDigits: String = "",
    val name: String = "",
    val otp: String = "",
    val isBusy: Boolean = false,
    @StringRes val errorRes: Int? = null,
    val resendSecondsLeft: Int = 0,
    val signedIn: Boolean = false
)

/**
 * Sign-up / login with a mobile number: enter number → receive OTP by SMS → enter OTP → signed in,
 * and the user's record is saved to the database. The number is required; the name is optional.
 */
class LoginViewModel(
    private val account: AccountRepository = AppServices.account,
    private val membership: MembershipRepository = AppServices.membership
) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    val isDemoMode: Boolean get() = account.authService.isDemoMode

    private var countdown: Job? = null

    fun onPhoneChange(value: String) {
        _uiState.update { it.copy(phoneDigits = value.filter(Char::isDigit).take(PHONE_DIGITS), errorRes = null) }
    }

    fun onNameChange(value: String) {
        _uiState.update { it.copy(name = value.take(MAX_NAME_LENGTH)) }
    }

    fun onOtpChange(value: String) {
        _uiState.update { it.copy(otp = value.filter(Char::isDigit).take(OTP_DIGITS), errorRes = null) }
    }

    fun requestOtp(activity: Activity, languageTag: String) {
        val state = _uiState.value
        if (!isValidIndianMobile(state.phoneDigits)) {
            _uiState.update { it.copy(errorRes = R.string.login_invalid_phone) }
            return
        }
        _uiState.update { it.copy(isBusy = true, errorRes = null) }
        account.authService.requestOtp(activity, phoneE164(state.phoneDigits)) { result ->
            when (result) {
                OtpRequestResult.CodeSent -> {
                    _uiState.update { it.copy(isBusy = false, step = LoginStep.ENTER_OTP, otp = "") }
                    startResendCountdown()
                }
                is OtpRequestResult.AutoVerified -> completeSignIn(result.uid, languageTag)
                is OtpRequestResult.Failed -> _uiState.update { it.copy(isBusy = false, errorRes = R.string.login_error_generic) }
            }
        }
    }

    fun verifyOtp(languageTag: String) {
        val state = _uiState.value
        if (state.otp.length != OTP_DIGITS) {
            _uiState.update { it.copy(errorRes = R.string.login_invalid_otp) }
            return
        }
        _uiState.update { it.copy(isBusy = true, errorRes = null) }
        account.authService.verifyOtp(state.otp) { result ->
            result.fold(
                onSuccess = { uid -> completeSignIn(uid, languageTag) },
                onFailure = { _uiState.update { it.copy(isBusy = false, errorRes = R.string.login_invalid_otp) } }
            )
        }
    }

    fun changeNumber() {
        countdown?.cancel()
        _uiState.update { it.copy(step = LoginStep.ENTER_PHONE, otp = "", errorRes = null, resendSecondsLeft = 0) }
    }

    fun signOut() {
        account.signOut()
        _uiState.value = LoginUiState()
    }

    private fun completeSignIn(uid: String, languageTag: String) {
        val state = _uiState.value
        account.onSignedIn(
            uid = uid,
            phoneNumber = phoneE164(state.phoneDigits),
            displayName = state.name,
            languageTag = languageTag,
            adFreeUntilMillis = membership.adFreeUntilMillis.value
        )
        countdown?.cancel()
        _uiState.update { it.copy(isBusy = false, signedIn = true) }
    }

    private fun startResendCountdown() {
        countdown?.cancel()
        countdown = viewModelScope.launch {
            for (seconds in RESEND_AFTER_SECONDS downTo 0) {
                _uiState.update { it.copy(resendSecondsLeft = seconds) }
                if (seconds > 0) delay(1_000)
            }
        }
    }

    companion object {
        const val PHONE_DIGITS = 10
        const val OTP_DIGITS = 6
        private const val MAX_NAME_LENGTH = 40
        private const val RESEND_AFTER_SECONDS = 30

        fun phoneE164(digits: String) = "+91$digits"

        /** Indian mobile numbers are 10 digits starting with 6, 7, 8 or 9. */
        fun isValidIndianMobile(digits: String) = digits.length == PHONE_DIGITS && digits.first() in '6'..'9'
    }
}
