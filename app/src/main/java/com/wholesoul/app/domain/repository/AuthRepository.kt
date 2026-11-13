package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.User
import kotlinx.coroutines.flow.StateFlow

interface AuthRepository {
    val currentUser: StateFlow<User?>

    suspend fun requestOtp(mobileNumber: String): Result<Unit>
    suspend fun verifyOtp(mobileNumber: String, otp: String): Result<User>
    suspend fun continueAsGuest(): Result<User>
    suspend fun logout()
}
