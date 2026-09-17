package com.rangepatte.app

import android.app.Application

/**
 * Application entry point. Kept deliberately thin — no DI framework is wired in yet;
 * screens construct their own ViewModels via factories until Room/DataStore (Phase 17-19)
 * introduce shared repositories that would justify one.
 */
class RangEPatteApplication : Application()
