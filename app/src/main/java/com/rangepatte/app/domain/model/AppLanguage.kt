package com.rangepatte.app.domain.model

/**
 * Supported app languages. [nativeName] is always rendered in that language's own script
 * regardless of the app's current locale (so a Hindi speaker can find "हिन्दी" on the language
 * picker even while the UI is still showing English) — it is a hard-coded label, not a
 * [androidx.annotation.StringRes], since translating "Hindi" into every other language would be
 * pointless: the point of this label is to always read correctly in its own language.
 *
 * [localeTag] matches an Android resource qualifier (`res/values-<tag>/strings.xml`).
 */
enum class AppLanguage(val localeTag: String, val nativeName: String, val englishName: String) {
    ENGLISH("en", "English", "English"),
    HINDI("hi", "हिन्दी", "Hindi"),
    TAMIL("ta", "தமிழ்", "Tamil"),
    TELUGU("te", "తెలుగు", "Telugu"),
    KANNADA("kn", "ಕನ್ನಡ", "Kannada"),
    MARATHI("mr", "मराठी", "Marathi"),
    BENGALI("bn", "বাংলা", "Bengali"),
    PUNJABI("pa", "ਪੰਜਾਬੀ", "Punjabi");

    companion object {
        fun fromLocaleTag(tag: String?): AppLanguage = entries.firstOrNull { it.localeTag == tag } ?: ENGLISH
    }
}
