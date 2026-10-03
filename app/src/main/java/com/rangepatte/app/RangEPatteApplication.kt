package com.rangepatte.app

import android.app.Application

/** Application entry point: creates the app-wide services (membership, account, ads). */
class RangEPatteApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppServices.init(this)
    }
}
