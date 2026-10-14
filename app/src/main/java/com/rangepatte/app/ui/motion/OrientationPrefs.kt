package com.rangepatte.app.ui.motion

import android.content.Context
import android.content.pm.ActivityInfo
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** How the screen may turn (Settings → Screen orientation). */
enum class OrientationMode(val requested: Int) {
    PORTRAIT(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT),
    LANDSCAPE(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE),
    /** Follows the phone: it turns as the phone is turned (unless the phone's rotation lock is on). */
    AUTO(ActivityInfo.SCREEN_ORIENTATION_FULL_USER)
}

/** The chosen [OrientationMode], kept between launches; MainActivity applies it as it changes. */
object OrientationPrefs {
    private const val PREFS = "orientation"
    private const val KEY = "mode"
    private val _mode = MutableStateFlow(OrientationMode.AUTO)
    val mode: StateFlow<OrientationMode> = _mode.asStateFlow()
    private var appContext: Context? = null

    fun init(context: Context) {
        appContext = context.applicationContext
        val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        _mode.value = OrientationMode.entries.firstOrNull { it.name == saved } ?: OrientationMode.AUTO
    }

    fun set(mode: OrientationMode) {
        _mode.value = mode
        appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)?.edit { putString(KEY, mode.name) }
    }
}
