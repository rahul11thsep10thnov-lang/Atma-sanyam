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

/** The country codes the login screen offers; India first and by default. */
data class CountryCode(val dial: String, val iso: String, val name: String)

val COUNTRY_CODES = listOf(
    CountryCode("+91", "IN", "India"), CountryCode("+1", "US", "USA / Canada"), CountryCode("+44", "GB", "United Kingdom"),
    CountryCode("+971", "AE", "UAE"), CountryCode("+65", "SG", "Singapore"), CountryCode("+61", "AU", "Australia"),
    CountryCode("+880", "BD", "Bangladesh"), CountryCode("+977", "NP", "Nepal"), CountryCode("+94", "LK", "Sri Lanka")
)

data class LoginUiState(
    val step: LoginStep = LoginStep.ENTER_PHONE,
    val country: CountryCode = COUNTRY_CODES.first(),
    /** The national number without the country code (10 digits for India). */
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
        val max = if (_uiState.value.country.iso == "IN") PHONE_DIGITS else MAX_INTL_DIGITS
        _uiState.update { it.copy(phoneDigits = value.filter(Char::isDigit).take(max), errorRes = null) }
    }

    fun onCountryChange(country: CountryCode) = _uiState.update { it.copy(country = country, errorRes = null) }

    private var otpSentAt = 0L
    private var wrongAttempts = 0

    fun onNameChange(value: String) {
        _uiState.update { it.copy(name = value.take(MAX_NAME_LENGTH)) }
    }

    fun onOtpChange(value: String) {
        _uiState.update { it.copy(otp = value.filter(Char::isDigit).take(OTP_DIGITS), errorRes = null) }
    }

    fun requestOtp(activity: Activity, languageTag: String) {
        val state = _uiState.value
        if (!isValidNumber(state.country, state.phoneDigits)) {
            _uiState.update { it.copy(errorRes = R.string.login_invalid_phone) }
            return
        }
        _uiState.update { it.copy(isBusy = true, errorRes = null) }
        account.authService.requestOtp(activity, phoneE164(state.country, state.phoneDigits)) { result ->
            when (result) {
                OtpRequestResult.CodeSent -> {
                    otpSentAt = System.currentTimeMillis()
                    wrongAttempts = 0
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
        if (System.currentTimeMillis() - otpSentAt > OTP_VALID_MS) {
            _uiState.update { it.copy(isBusy = false, otp = "", errorRes = R.string.login_otp_expired) }
            return
        }
        _uiState.update { it.copy(isBusy = true, errorRes = null) }
        account.authService.verifyOtp(state.otp) { result ->
            result.fold(
                onSuccess = { uid -> completeSignIn(uid, languageTag) },
                onFailure = { error ->
                    wrongAttempts++
                    when {
                        error is java.io.IOException || error.javaClass.simpleName.contains("Network") ->
                            _uiState.update { it.copy(isBusy = false, errorRes = R.string.login_network_error) }
                        wrongAttempts >= MAX_WRONG_ATTEMPTS -> {
                            // Too many wrong codes: back to the number, a fresh OTP is needed.
                            countdown?.cancel()
                            _uiState.update { it.copy(isBusy = false, step = LoginStep.ENTER_PHONE, otp = "", resendSecondsLeft = 0, errorRes = R.string.login_too_many_attempts) }
                        }
                        else -> _uiState.update { it.copy(isBusy = false, otp = "", errorRes = R.string.login_invalid_otp) }
                    }
                }
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
            phoneNumber = phoneE164(state.country, state.phoneDigits),
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
        const val MAX_INTL_DIGITS = 14
        const val OTP_DIGITS = 6
        private const val MAX_NAME_LENGTH = 40
        private const val RESEND_AFTER_SECONDS = 30
        private const val MAX_WRONG_ATTEMPTS = 5
        /** Firebase's codes last longer, but we stop accepting after this and ask for a fresh one. */
        private const val OTP_VALID_MS = 5 * 60 * 1000L

        fun phoneE164(country: CountryCode, digits: String) = country.dial + digits

        /** India: exactly 10 digits starting 6–9. Elsewhere: 6–14 digits (the provider validates further). */
        fun isValidNumber(country: CountryCode, digits: String) =
            if (country.iso == "IN") isValidIndianMobile(digits) else digits.length in 6..MAX_INTL_DIGITS

        /** Indian mobile numbers are 10 digits starting with 6, 7, 8 or 9. */
        fun isValidIndianMobile(digits: String) = digits.length == PHONE_DIGITS && digits.first() in '6'..'9'
    }
}
