package com.wholesoul.app.data.repository

import com.wholesoul.app.data.mock.MockNotificationData
import com.wholesoul.app.domain.model.AppNotification
import com.wholesoul.app.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Local/mock notification center (spec section 23). Architecture allows swapping this for a
 * Firebase Cloud Messaging-backed repository later without touching NotificationsScreen.
 */
@Singleton
class MockNotificationRepository @Inject constructor() : NotificationRepository {

    private val state = MutableStateFlow(MockNotificationData.notifications)
    override val notifications = state.asStateFlow()

    override suspend fun markAsRead(notificationId: String) {
        state.value = state.value.map { if (it.id == notificationId) it.copy(isRead = true) else it }
    }

    override suspend fun markAllAsRead() {
        state.value = state.value.map { it.copy(isRead = true) }
    }
}
