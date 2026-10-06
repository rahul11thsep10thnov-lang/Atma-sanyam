package com.rangepatte.app.data.local

import android.content.Context
import androidx.core.content.edit

/** The name other people see at a table with you (remembered between games). */
object PlayerNamePreferences {
    private const val PREFS_NAME = "player_prefs"
    private const val KEY_NAME = "display_name"

    fun get(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_NAME, null)?.takeIf { it.isNotBlank() }

    fun set(context: Context, name: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit { putString(KEY_NAME, name.trim().take(20)) }
    }
}
