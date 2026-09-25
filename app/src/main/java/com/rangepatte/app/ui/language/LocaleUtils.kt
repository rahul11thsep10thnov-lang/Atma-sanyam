package com.rangepatte.app.ui.language

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import com.rangepatte.app.domain.model.AppLanguage
import java.util.Locale

/**
 * Wraps [this] in a new [Context] whose resource configuration is pinned to [language]'s locale,
 * regardless of the device's system language. Used from `Activity.attachBaseContext()` so a
 * language chosen in-app takes effect immediately, the same way it would if the user had changed
 * their device language — without requiring a full per-app-locale API (which would need API 33+
 * without the appcompat backport) for this app's minSdk 24.
 */
fun Context.withAppLocale(language: AppLanguage): Context {
    val locale = Locale(language.localeTag)
    Locale.setDefault(locale)
    val configuration = Configuration(resources.configuration)
    configuration.setLocale(locale)
    configuration.setLayoutDirection(locale)
    return createConfigurationContext(configuration)
}

/**
 * Unwraps a Compose [androidx.compose.ui.platform.LocalContext] (or any [ContextWrapper] chain)
 * to find the underlying [Activity], needed to call [Activity.recreate] after changing the
 * in-app language so the new locale is fully re-applied everywhere (including already-resolved
 * string resources) rather than just for content composed after the change.
 */
fun Context.findActivity(): Activity? {
    var context = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    return null
}
