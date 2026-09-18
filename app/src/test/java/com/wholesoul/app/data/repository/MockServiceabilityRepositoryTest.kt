package com.wholesoul.app.data.repository

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runTest
import org.junit.Test

class MockServiceabilityRepositoryTest {

    private val repository = MockServiceabilityRepository()

    @Test
    fun `known pin code is serviceable`() = runTest {
        val area = repository.checkPinCode("400001").getOrThrow()
        assertThat(area.isServiceable).isTrue()
    }

    @Test
    fun `unknown pin code is not serviceable`() = runTest {
        val area = repository.checkPinCode("999999").getOrThrow()
        assertThat(area.isServiceable).isFalse()
    }

    @Test
    fun `invalid pin code format fails`() = runTest {
        val result = repository.checkPinCode("123")
        assertThat(result.isFailure).isTrue()
    }

    @Test
    fun `states are available for india`() = runTest {
        val states = repository.getStates("India")
        assertThat(states).isNotEmpty()
    }
}
