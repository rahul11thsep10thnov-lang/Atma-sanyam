package com.rangepatte.app.ui.motion

import android.content.Context
import android.provider.Settings
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The in-app "Animations" switch (Settings), kept between launches. Off means reduced motion: the die
 * shows its result at once, tokens jump instead of gliding. The phone's own "Remove animations"
 * setting (animator scale 0) is honoured as well.
 */
object MotionPrefs {
    private const val PREFS = "motion"
    private const val KEY_ANIMATIONS = "animations"
    private val _animations = MutableStateFlow(true)
    val animations: StateFlow<Boolean> = _animations.asStateFlow()
    private var appContext: Context? = null

    fun init(context: Context) {
        appContext = context.applicationContext
        _animations.value = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ANIMATIONS, true)
    }

    fun setAnimations(on: Boolean) {
        _animations.value = on
        appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)?.edit { putBoolean(KEY_ANIMATIONS, on) }
    }

    /** True when motion should be reduced: the app switch is off, or the phone has animations removed. */
    fun reduceMotion(context: Context): Boolean {
        val system = runCatching { Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }.getOrDefault(false)
        return system || !_animations.value
    }
}
