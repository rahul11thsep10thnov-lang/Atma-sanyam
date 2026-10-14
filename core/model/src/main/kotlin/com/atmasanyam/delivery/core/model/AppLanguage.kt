package com.atmasanyam.delivery.core.model

/** Languages the app can be shown in. [nativeName] is always written in the language itself. */
enum class AppLanguage(val languageTag: String, val nativeName: String) {
    ENGLISH("en", "English"),
    HINDI("hi", "हिन्दी"),
    ;

    companion object {
        /** Maps a locale language code such as "hi" or "hi-IN" to a supported language (English if unknown). */
        fun fromTag(tag: String?): AppLanguage =
            entries.firstOrNull { tag != null && tag.startsWith(it.languageTag, ignoreCase = true) } ?: ENGLISH
    }
}
