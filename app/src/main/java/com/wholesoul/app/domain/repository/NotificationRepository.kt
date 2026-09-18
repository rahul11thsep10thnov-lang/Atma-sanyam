package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.AppNotification
import kotlinx.coroutines.flow.Flow

interface NotificationRepository {
    val notifications: Flow<List<AppNotification>>

    suspend fun markAsRead(notificationId: String)
    suspend fun markAllAsRead()
}
