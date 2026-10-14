package com.wholesoul.app.presentation.admin

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.admin.AdminPinStore
import com.wholesoul.app.data.admin.PinAdminAccess
import com.wholesoul.app.data.admin.StoredPin
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class AdminGateViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private class MemoryPinStore : AdminPinStore {
        var stored: StoredPin? = null
        override suspend fun load() = stored
        override suspend fun save(pin: StoredPin) { stored = pin }
    }

    private val store = MemoryPinStore()
    private val access = PinAdminAccess(store)

    private fun viewModel() = AdminGateViewModel(access)

    @Test
    fun `first visit asks the owner to create a pin`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel()
        advanceUntilIdle()
        assertThat(vm.uiState.value.mode).isEqualTo(GateMode.CREATE_PIN)
    }

    @Test
    fun `creating a pin needs matching entries and then unlocks`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel()
        advanceUntilIdle()

        vm.onPinChange("12")
        vm.submit(); advanceUntilIdle()
        assertThat(vm.uiState.value.error).contains("4")
        assertThat(vm.isUnlocked.value).isFalse()

        vm.onPinChange("2468"); vm.onConfirmPinChange("2469")
        vm.submit(); advanceUntilIdle()
        assertThat(vm.uiState.value.error).contains("don't match")
        assertThat(vm.isUnlocked.value).isFalse()

        vm.onConfirmPinChange("2468")
        vm.submit(); advanceUntilIdle()
        assertThat(vm.isUnlocked.value).isTrue()
    }

    @Test
    fun `later visits ask for the pin and a wrong pin is rejected`() = runTest(mainDispatcherRule.testDispatcher) {
        access.setPin("2468"); access.lock()
        val vm = viewModel()
        advanceUntilIdle()
        assertThat(vm.uiState.value.mode).isEqualTo(GateMode.ENTER_PIN)

        vm.onPinChange("0000")
        vm.submit(); advanceUntilIdle()
        assertThat(vm.uiState.value.error).isEqualTo("Wrong PIN")
        assertThat(vm.uiState.value.pin).isEmpty()
        assertThat(vm.isUnlocked.value).isFalse()

        vm.onPinChange("2468")
        vm.submit(); advanceUntilIdle()
        assertThat(vm.isUnlocked.value).isTrue()
    }

    @Test
    fun `only digits are accepted and the pin is capped at eight`() = runTest(mainDispatcherRule.testDispatcher) {
        val vm = viewModel()
        advanceUntilIdle()
        vm.onPinChange("1a2b3c4d5e6f7g8h9")
        assertThat(vm.uiState.value.pin).isEqualTo("12345678")
    }

    @Test
    fun `locking closes the console again`() = runTest(mainDispatcherRule.testDispatcher) {
        access.setPin("2468")
        val vm = viewModel()
        assertThat(vm.isUnlocked.value).isTrue()
        vm.lock()
        advanceUntilIdle()
        assertThat(vm.isUnlocked.value).isFalse()
    }
}
