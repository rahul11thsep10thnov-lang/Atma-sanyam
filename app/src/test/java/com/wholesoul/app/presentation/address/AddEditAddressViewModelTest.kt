package com.wholesoul.app.presentation.address

import androidx.lifecycle.SavedStateHandle
import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.repository.MockServiceabilityRepository
import com.wholesoul.app.fakes.FakeAddressRepository
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class AddEditAddressViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private fun createViewModel(addressRepository: FakeAddressRepository = FakeAddressRepository()) =
        AddEditAddressViewModel(
            savedStateHandle = SavedStateHandle(),
            addressRepository = addressRepository,
            serviceabilityRepository = MockServiceabilityRepository(),
        )

    @Test
    fun `form is invalid until all required fields are filled`() = runTest(mainDispatcherRule.testDispatcher) {
        val viewModel = createViewModel()
        assertThat(viewModel.formState.value.isValid).isFalse()

        viewModel.onFullNameChange("Test User")
        viewModel.onMobileChange("9876543210")
        viewModel.onHouseNumberChange("12")
        viewModel.onBuildingStreetChange("Main Street")
        viewModel.onAreaChange("Civil Lines")
        viewModel.onStateChange("Maharashtra")
        viewModel.onCityChange("Mumbai")
        viewModel.onPinCodeChange("400001")

        assertThat(viewModel.formState.value.isValid).isTrue()
    }

    @Test
    fun `entering a known serviceable pin code shows a positive message`() = runTest(mainDispatcherRule.testDispatcher) {
        val viewModel = createViewModel()
        viewModel.onPinCodeChange("400001")

        assertThat(viewModel.formState.value.isServiceable).isTrue()
    }

    @Test
    fun `entering an unserviceable pin code shows a coming-soon message`() = runTest(mainDispatcherRule.testDispatcher) {
        val viewModel = createViewModel()
        viewModel.onPinCodeChange("999999")

        assertThat(viewModel.formState.value.isServiceable).isFalse()
    }

    @Test
    fun `saving a valid address adds it to the repository`() = runTest(mainDispatcherRule.testDispatcher) {
        val addressRepository = FakeAddressRepository()
        val viewModel = createViewModel(addressRepository)

        viewModel.onFullNameChange("Test User")
        viewModel.onMobileChange("9876543210")
        viewModel.onHouseNumberChange("12")
        viewModel.onBuildingStreetChange("Main Street")
        viewModel.onAreaChange("Civil Lines")
        viewModel.onStateChange("Maharashtra")
        viewModel.onCityChange("Mumbai")
        viewModel.onPinCodeChange("400001")
        viewModel.save()

        assertThat(addressRepository.addresses.value).hasSize(1)
        assertThat(viewModel.formState.value.saved).isTrue()
    }
}
