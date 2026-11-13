package com.wholesoul.app.util

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/**
 * Swaps Dispatchers.Main for a test dispatcher so ViewModel.viewModelScope runs synchronously
 * in tests. Pass [testDispatcher] into `runTest(...)` in tests whose ViewModel talks to a
 * repository that calls `delay()` (e.g. the mock repositories' simulated network latency),
 * so both the ViewModel's coroutines and the test body share one virtual-time scheduler.
 */
class MainDispatcherRule(
    val testDispatcher: TestDispatcher = UnconfinedTestDispatcher(),
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(testDispatcher)
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
