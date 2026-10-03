package com.rangepatte.app.data.auth

import android.app.Activity

/** Outcome of asking for an OTP SMS. */
sealed interface OtpRequestResult {
    /** The SMS is on its way; the user should now type the code. */
    data object CodeSent : OtpRequestResult
    /** Android read the SMS by itself and the user is already signed in — no typing needed. */
    data class AutoVerified(val uid: String) : OtpRequestResult
    data class Failed(val message: String?) : OtpRequestResult
}

/**
 * Mobile-number + OTP sign-in. [FirebasePhoneAuthService] sends real SMS once the Firebase project
 * is connected; until then [DemoPhoneAuthService] lets the whole flow be tried on-device.
 */
interface PhoneAuthService {
    /** True when no SMS is really sent (demo mode) — the login screen then shows the demo code. */
    val isDemoMode: Boolean

    /** [phoneE164] is the full international number, e.g. "+919876543210". */
    fun requestOtp(activity: Activity, phoneE164: String, onResult: (OtpRequestResult) -> Unit)

    /** Checks the typed [code]; on success returns the user's permanent id. */
    fun verifyOtp(code: String, onResult: (Result<String>) -> Unit)

    fun signOut()
}
