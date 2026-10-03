package com.rangepatte.app.ui.language

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import android.content.res.Resources
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import com.rangepatte.app.domain.model.AppLanguage
import java.util.Locale

/** The language the UI is currently shown in — read by content that is not a string resource (e.g. rules). */
val LocalAppLanguage = staticCompositionLocalOf { AppLanguage.ENGLISH }

/**
 * Shows [content] in [language], switching instantly — no activity restart, no app relaunch.
 *
 * It swaps the Compose [LocalContext] for a wrapper whose [Resources] are pinned to [language], and
 * [LocalConfiguration] for the matching configuration, so every `stringResource` below re-resolves
 * the moment [language] changes. The wrapper still has the real Activity as its base context, so
 * [findActivity] keeps working for ads, OTP login and payments.
 */
@Composable
fun ProvideAppLocale(language: AppLanguage, content: @Composable () -> Unit) {
    val baseContext = LocalContext.current
    val baseConfiguration = LocalConfiguration.current
    val localized = remember(language, baseContext, baseConfiguration) {
        val locale = Locale(language.localeTag)
        Locale.setDefault(locale)
        val configuration = Configuration(baseConfiguration).apply {
            setLocale(locale)
            setLayoutDirection(locale)
        }
        val resources = baseContext.createConfigurationContext(configuration).resources
        LocalizedContext(baseContext, resources) to configuration
    }
    CompositionLocalProvider(
        LocalContext provides localized.first,
        LocalConfiguration provides localized.second,
        LocalAppLanguage provides language,
        content = content
    )
}

private class LocalizedContext(base: Context, private val localizedResources: Resources) : ContextWrapper(base) {
    override fun getResources(): Resources = localizedResources
}

/** Unwraps a Compose [LocalContext] (or any [ContextWrapper] chain) to the hosting [Activity]. */
fun Context.findActivity(): Activity? {
    var context = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    return null
}
