package com.wholesoul.app.fakes

import com.wholesoul.app.domain.model.AuthState
import com.wholesoul.app.domain.model.User
import com.wholesoul.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import java.util.UUID

class FakeAuthRepository(private val validOtp: String = "1234") : AuthRepository {
    override val currentUser = MutableStateFlow<User?>(null)

    override suspend fun requestOtp(mobileNumber: String): Result<Unit> =
        if (mobileNumber.length == 10) Result.success(Unit) else Result.failure(IllegalArgumentException("Enter a valid 10-digit mobile number"))

    override suspend fun verifyOtp(mobileNumber: String, otp: String): Result<User> {
        if (otp != validOtp) return Result.failure(IllegalStateException("Incorrect OTP"))
        val user = User(UUID.randomUUID().toString(), "Test User", mobileNumber, authState = AuthState.LOGGED_IN)
        currentUser.value = user
        return Result.success(user)
    }

    override suspend fun continueAsGuest(): Result<User> {
        val user = User(UUID.randomUUID().toString(), "Guest", "", authState = AuthState.GUEST)
        currentUser.value = user
        return Result.success(user)
    }

    override suspend fun logout() {
        currentUser.value = null
    }
}
