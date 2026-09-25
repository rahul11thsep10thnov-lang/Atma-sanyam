package com.wholesoul.app.presentation.auth

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.fakes.FakeAuthRepository
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class AuthViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `otp requested for valid mobile number moves to otp screen`() = runTest {
        val viewModel = AuthViewModel(FakeAuthRepository())
        viewModel.onMobileNumberChange("9876543210")

        var sentTo: String? = null
        viewModel.requestOtp { sentTo = it }

        assertThat(sentTo).isEqualTo("9876543210")
        assertThat(viewModel.uiState.value.errorMessage).isNull()
    }

    @Test
    fun `correct otp logs the user in`() = runTest {
        val viewModel = AuthViewModel(FakeAuthRepository(validOtp = "1234"))
        viewModel.onOtpChange("1234")

        viewModel.verifyOtp("9876543210")

        assertThat(viewModel.uiState.value.loginSuccess).isTrue()
        assertThat(viewModel.uiState.value.errorMessage).isNull()
    }

    @Test
    fun `incorrect otp shows an error and does not log in`() = runTest {
        val viewModel = AuthViewModel(FakeAuthRepository(validOtp = "1234"))
        viewModel.onOtpChange("0000")

        viewModel.verifyOtp("9876543210")

        assertThat(viewModel.uiState.value.loginSuccess).isFalse()
        assertThat(viewModel.uiState.value.errorMessage).isNotNull()
    }

    @Test
    fun `continue as guest succeeds without a mobile number`() = runTest {
        val viewModel = AuthViewModel(FakeAuthRepository())

        viewModel.continueAsGuest()

        assertThat(viewModel.uiState.value.guestSuccess).isTrue()
    }
}
