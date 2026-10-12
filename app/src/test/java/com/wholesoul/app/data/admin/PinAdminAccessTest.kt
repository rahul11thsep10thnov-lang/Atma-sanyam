package com.wholesoul.app.data.admin

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runTest
import org.junit.Test

class PinAdminAccessTest {

    private class MemoryPinStore : AdminPinStore {
        var stored: StoredPin? = null
        override suspend fun load() = stored
        override suspend fun save(pin: StoredPin) { stored = pin }
    }

    private val store = MemoryPinStore()
    private val access = PinAdminAccess(store)

    @Test
    fun `starts locked with no pin`() = runTest {
        assertThat(access.isUnlocked.value).isFalse()
        assertThat(access.hasPin()).isFalse()
    }

    @Test
    fun `setting a pin unlocks and later the same pin unlocks again`() = runTest {
        assertThat(access.setPin("2468").isSuccess).isTrue()
        assertThat(access.isUnlocked.value).isTrue()
        assertThat(access.hasPin()).isTrue()

        access.lock()
        assertThat(access.isUnlocked.value).isFalse()
        assertThat(access.unlock("2468")).isTrue()
        assertThat(access.isUnlocked.value).isTrue()
    }

    @Test
    fun `a wrong pin keeps the console locked`() = runTest {
        access.setPin("2468")
        access.lock()
        assertThat(access.unlock("1111")).isFalse()
        assertThat(access.unlock("")).isFalse()
        assertThat(access.isUnlocked.value).isFalse()
    }

    @Test
    fun `unlocking without a pin set always fails`() = runTest {
        assertThat(access.unlock("1234")).isFalse()
    }

    @Test
    fun `pins must be four to eight digits`() = runTest {
        listOf("", "123", "123456789", "12ab", "12 34").forEach { bad ->
            assertThat(access.setPin(bad).isFailure).isTrue()
        }
        assertThat(access.hasPin()).isFalse()
        assertThat(access.setPin("12345678").isSuccess).isTrue()
    }

    @Test
    fun `the pin itself is never stored`() = runTest {
        access.setPin("2468")
        val saved = store.stored!!
        assertThat(String(saved.hash)).doesNotContain("2468")
        assertThat(saved.hash.size).isEqualTo(32)
        assertThat(saved.salt.size).isAtLeast(16)
    }

    @Test
    fun `the same pin gets a different hash each time it is set`() = runTest {
        access.setPin("2468")
        val first = store.stored!!
        access.setPin("2468")
        val second = store.stored!!
        assertThat(first.hash.toList()).isNotEqualTo(second.hash.toList())
    }

    @Test
    fun `changing the pin replaces the old one`() = runTest {
        access.setPin("2468")
        access.setPin("1357")
        access.lock()
        assertThat(access.unlock("2468")).isFalse()
        assertThat(access.unlock("1357")).isTrue()
    }
}
