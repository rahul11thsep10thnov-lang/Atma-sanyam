package com.atmasanyam.app.ui

import androidx.lifecycle.ViewModel
import com.atmasanyam.app.data.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    preferencesRepository: PreferencesRepository,
) : ViewModel() {
    val hasOnboarded: Flow<Boolean> = preferencesRepository.hasOnboarded
}
