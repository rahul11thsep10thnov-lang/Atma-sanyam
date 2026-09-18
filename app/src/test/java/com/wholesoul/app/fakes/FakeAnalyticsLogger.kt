package com.wholesoul.app.fakes

import com.wholesoul.app.core.analytics.AnalyticsEvent
import com.wholesoul.app.core.analytics.AnalyticsLogger

class FakeAnalyticsLogger : AnalyticsLogger {
    val events = mutableListOf<AnalyticsEvent>()
    override fun log(event: AnalyticsEvent) { events.add(event) }
}
