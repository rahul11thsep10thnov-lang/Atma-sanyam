package com.rangepatte.app.data.auth

import android.app.Activity
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit

/**
 * Real SMS OTP through Firebase Authentication. Requires (one-time, in the Firebase console):
 * Authentication ▸ Sign-in method ▸ Phone enabled, and the app's SHA-1/SHA-256 fingerprints added
 * under Project settings. See README "Login, ads and payments".
 */
class FirebasePhoneAuthService : PhoneAuthService {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private var verificationId: String? = null
    private var resendToken: PhoneAuthProvider.ForceResendingToken? = null
    private var lastPhone: String? = null

    override val isDemoMode: Boolean = false

    override fun requestOtp(activity: Activity, phoneE164: String, onResult: (OtpRequestResult) -> Unit) {
        if (phoneE164 != lastPhone) resendToken = null
        lastPhone = phoneE164

        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                signIn(credential) { result ->
                    onResult(
                        result.fold(
                            onSuccess = { OtpRequestResult.AutoVerified(it) },
                            onFailure = { OtpRequestResult.Failed(it.message) }
                        )
                    )
                }
            }

            override fun onVerificationFailed(e: FirebaseException) {
                onResult(OtpRequestResult.Failed(e.message))
            }

            override fun onCodeSent(id: String, token: PhoneAuthProvider.ForceResendingToken) {
                verificationId = id
                resendToken = token
                onResult(OtpRequestResult.CodeSent)
            }
        }

        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneE164)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
        resendToken?.let { options.setForceResendingToken(it) }
        PhoneAuthProvider.verifyPhoneNumber(options.build())
    }

    override fun verifyOtp(code: String, onResult: (Result<String>) -> Unit) {
        val id = verificationId
        if (id == null) {
            onResult(Result.failure(IllegalStateException("No OTP was requested")))
            return
        }
        signIn(PhoneAuthProvider.getCredential(id, code.trim()), onResult)
    }

    private fun signIn(credential: PhoneAuthCredential, onResult: (Result<String>) -> Unit) {
        auth.signInWithCredential(credential).addOnCompleteListener { task ->
            val uid = if (task.isSuccessful) task.result?.user?.uid else null
            if (uid != null) {
                onResult(Result.success(uid))
            } else {
                onResult(Result.failure(task.exception ?: IllegalStateException("Sign-in failed")))
            }
        }
    }

    override fun signOut() {
        auth.signOut()
        verificationId = null
        resendToken = null
    }
}
