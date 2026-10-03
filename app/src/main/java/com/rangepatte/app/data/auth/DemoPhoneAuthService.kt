package com.rangepatte.app.data.auth

import android.app.Activity

/**
 * Used while Firebase is not connected (no google-services.json). No SMS is sent: the code is always
 * [DEMO_OTP], shown on the login screen, so the sign-up flow can be tested end to end on a phone.
 * The account is kept only on this device.
 */
class DemoPhoneAuthService : PhoneAuthService {
    private var pendingPhone: String? = null

    override val isDemoMode: Boolean = true

    override fun requestOtp(activity: Activity, phoneE164: String, onResult: (OtpRequestResult) -> Unit) {
        pendingPhone = phoneE164
        onResult(OtpRequestResult.CodeSent)
    }

    override fun verifyOtp(code: String, onResult: (Result<String>) -> Unit) {
        val phone = pendingPhone
        when {
            phone == null -> onResult(Result.failure(IllegalStateException("No OTP was requested")))
            code.trim() != DEMO_OTP -> onResult(Result.failure(IllegalArgumentException("Wrong OTP")))
            else -> onResult(Result.success("demo-" + phone.filter(Char::isDigit)))
        }
    }

    override fun signOut() {
        pendingPhone = null
    }

    companion object {
        const val DEMO_OTP = "123456"
    }
}
