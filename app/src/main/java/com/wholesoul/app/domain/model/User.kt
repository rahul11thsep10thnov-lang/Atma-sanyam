package com.wholesoul.app.domain.model

enum class AuthState {
    LOGGED_OUT,
    GUEST,
    LOGGED_IN,
}

data class User(
    val id: String,
    val name: String,
    val mobileNumber: String,
    val email: String? = null,
    val authState: AuthState = AuthState.LOGGED_IN,
)
