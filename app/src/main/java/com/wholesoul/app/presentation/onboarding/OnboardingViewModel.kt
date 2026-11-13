package com.wholesoul.app.presentation.onboarding

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.data.local.SessionPreferenceKeys
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) : ViewModel() {

    fun markOnboardingSeen(onDone: () -> Unit) {
        viewModelScope.launch {
            dataStore.edit { it[SessionPreferenceKeys.HAS_SEEN_ONBOARDING] = true }
            onDone()
        }
    }
}
