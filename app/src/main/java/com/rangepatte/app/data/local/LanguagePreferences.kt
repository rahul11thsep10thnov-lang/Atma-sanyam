package com.rangepatte.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.rangepatte.app.domain.model.AppLanguage

/**
 * Synchronous, lightweight persistence for the chosen UI language — deliberately plain
 * [SharedPreferences] rather than DataStore, since the stored value must be readable
 * synchronously in `Activity.attachBaseContext()`, before any Compose/coroutine machinery exists
 * yet for that process. Broader settings (Phase 18) can move to DataStore without this needing to
 * follow, since this is read from a different lifecycle point than everything else.
 */
object LanguagePreferences {
    private const val PREFS_NAME = "language_prefs"
    private const val KEY_LOCALE_TAG = "locale_tag"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** Null means the user has never picked a language — the app should show the picker. */
    fun getSelectedLanguage(context: Context): AppLanguage? {
        val tag = prefs(context).getString(KEY_LOCALE_TAG, null) ?: return null
        return AppLanguage.fromLocaleTag(tag)
    }

    fun setSelectedLanguage(context: Context, language: AppLanguage) {
        prefs(context).edit { putString(KEY_LOCALE_TAG, language.localeTag) }
    }
}
