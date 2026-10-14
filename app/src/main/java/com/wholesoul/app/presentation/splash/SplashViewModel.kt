package com.wholesoul.app.presentation.splash

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.core.analytics.AnalyticsEvent
import com.wholesoul.app.core.analytics.AnalyticsLogger
import com.wholesoul.app.data.local.SessionPreferenceKeys
import com.wholesoul.app.domain.model.AuthState
import com.wholesoul.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SplashDestination { ONBOARDING, LOGIN, HOME }

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val dataStore: DataStore<Preferences>,
    private val analyticsLogger: AnalyticsLogger,
) : ViewModel() {

    private val _destination = MutableStateFlow<SplashDestination?>(null)
    val destination: StateFlow<SplashDestination?> = _destination.asStateFlow()

    init {
        analyticsLogger.log(AnalyticsEvent.AppOpened)
        viewModelScope.launch {
            delay(1400L)
            val hasSeenOnboarding = dataStore.data.first()[SessionPreferenceKeys.HAS_SEEN_ONBOARDING] ?: false
            val user = authRepository.currentUser.value
            _destination.value = when {
                !hasSeenOnboarding -> SplashDestination.ONBOARDING
                user != null && user.authState != AuthState.LOGGED_OUT -> SplashDestination.HOME
                else -> SplashDestination.LOGIN
            }
        }
    }
}
