package com.wholesoul.app.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wholesoul.app.domain.model.AppNotification
import com.wholesoul.app.domain.repository.NotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationRepository: NotificationRepository,
) : ViewModel() {

    val notifications: StateFlow<List<AppNotification>> = notificationRepository.notifications
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun markAsRead(id: String) {
        viewModelScope.launch { notificationRepository.markAsRead(id) }
    }

    fun markAllAsRead() {
        viewModelScope.launch { notificationRepository.markAllAsRead() }
    }
}
