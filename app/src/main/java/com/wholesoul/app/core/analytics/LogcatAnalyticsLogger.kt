package com.wholesoul.app.core.analytics

import android.util.Log
import javax.inject.Inject
import javax.inject.Singleton

/** Development-mode analytics sink. Swap for a Firebase Analytics-backed logger in di/AppModule. */
@Singleton
class LogcatAnalyticsLogger @Inject constructor() : AnalyticsLogger {
    override fun log(event: AnalyticsEvent) {
        Log.d("WholesoulAnalytics", "${event.name} ${event.params}")
    }
}
