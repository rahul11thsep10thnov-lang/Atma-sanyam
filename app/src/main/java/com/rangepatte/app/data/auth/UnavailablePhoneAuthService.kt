package com.rangepatte.app.data.auth

import android.app.Activity

/**
 * What a RELEASE build uses if Firebase somehow is not connected: sign-in simply reports failure. The
 * demo login (fixed OTP) exists for debug builds only, and the release build refuses to build without
 * google-services.json, so this is a last line of defence.
 */
class UnavailablePhoneAuthService : PhoneAuthService {
    override val isDemoMode: Boolean = false

    override fun requestOtp(activity: Activity, phoneE164: String, onResult: (OtpRequestResult) -> Unit) {
        onResult(OtpRequestResult.Failed("Sign-in is not available right now."))
    }

    override fun verifyOtp(code: String, onResult: (Result<String>) -> Unit) {
        onResult(Result.failure(IllegalStateException("Sign-in is not available right now.")))
    }

    override fun signOut() = Unit
}
