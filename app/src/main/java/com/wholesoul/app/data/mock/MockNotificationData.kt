package com.wholesoul.app.data.mock

import com.wholesoul.app.domain.model.AppNotification
import com.wholesoul.app.domain.model.NotificationType
import java.util.concurrent.TimeUnit

object MockNotificationData {

    val notifications: List<AppNotification> by lazy {
        val now = System.currentTimeMillis()
        listOf(
            AppNotification("n1", NotificationType.ORDER_UPDATE, "Your order has been packed", "Order #WS10234 is packed and ready for dispatch.", now - TimeUnit.MINUTES.toMillis(12)),
            AppNotification("n2", NotificationType.ARRIVAL, "Fresh flowers have arrived", "New jasmine and marigold stock just landed. Shop now.", now - TimeUnit.HOURS.toMillis(2)),
            AppNotification("n3", NotificationType.OFFER, "Rs 50 OFF on your next order", "Use code FIRST50 before it expires.", now - TimeUnit.HOURS.toMillis(5)),
            AppNotification("n4", NotificationType.ORDER_UPDATE, "Your order is out for delivery", "Order #WS10229 is on its way to you.", now - TimeUnit.HOURS.toMillis(9)),
            AppNotification("n5", NotificationType.OFFER, "Weekend vegetable sale is live", "Up to 30% off on fresh vegetables this weekend.", now - TimeUnit.DAYS.toMillis(1)),
            AppNotification("n6", NotificationType.GENERAL, "Welcome to WHOLESOUL", "Fast, fresh and frugal — straight from the source.", now - TimeUnit.DAYS.toMillis(2), isRead = true),
        )
    }
}
