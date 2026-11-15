package com.rangepatte.app.ui.theme

/**
 * The type scale as plain numbers (sp), with no Compose dependency so it can be unit-tested on the JVM.
 * [AppType] in Type.kt turns these into text styles. Every size in the app comes from here.
 *
 * Game names are deliberately 21 sp — 2 sp larger than the earlier recommendation.
 */
object TypeScale {
    const val BRAND = 34f           // app logo / main branding        (32–36)
    const val SCREEN_TITLE = 21f    // main screen heading             (20–22)
    const val SECTION_TITLE = 23f   // section heading                 (22–24)
    const val GAME_TITLE = 21f      // game names and game-mode titles (20–22)
    const val PLAYER_NAME = 16f     // player names                    (15–16)
    const val PLAYER_NAME_COMPACT = 14f // player names in narrow side plaques and tables (14 is the floor for gameplay text)
    const val BODY = 15f            // body text and instructions      (15–16)
    const val BODY_LARGE = 16f      // larger body copy                (15–16)
    const val SCORE = 17f           // scores and points               (16–18)
    const val PRIMARY_BUTTON = 15f  // primary buttons                 (14–16)
    const val SECONDARY_LABEL = 13f // secondary labels                (12–13)
    const val NAVIGATION = 12f      // bottom navigation labels        (12–13)
    const val METADATA = 12f        // small metadata                  (11–12)

    /** Line height as a multiple of the font size. Devanagari adds [DEVANAGARI_EXTRA] so matras are never clipped. */
    const val LINE_TITLE = 1.3f
    const val LINE_BODY = 1.5f
    const val LINE_LABEL = 1.4f
    const val DEVANAGARI_EXTRA = 0.1f

    /** No text that carries information is ever set below this. */
    const val MINIMUM = 11f

    /** The allowed range for each token, exactly as specified in the typography brief. */
    val ranges: Map<String, ClosedFloatingPointRange<Float>> = mapOf(
        "BRAND" to 32f..36f,
        "SCREEN_TITLE" to 20f..22f,
        "SECTION_TITLE" to 22f..24f,
        "GAME_TITLE" to 20f..22f,
        "PLAYER_NAME" to 15f..16f,
        "PLAYER_NAME_COMPACT" to 14f..16f,
        "BODY" to 15f..16f,
        "BODY_LARGE" to 15f..16f,
        "SCORE" to 16f..18f,
        "PRIMARY_BUTTON" to 14f..16f,
        "SECONDARY_LABEL" to 12f..13f,
        "NAVIGATION" to 12f..13f,
        "METADATA" to 11f..12f
    )

    val sizes: Map<String, Float> = mapOf(
        "BRAND" to BRAND, "SCREEN_TITLE" to SCREEN_TITLE, "SECTION_TITLE" to SECTION_TITLE,
        "GAME_TITLE" to GAME_TITLE, "PLAYER_NAME" to PLAYER_NAME, "PLAYER_NAME_COMPACT" to PLAYER_NAME_COMPACT, "BODY" to BODY,
        "BODY_LARGE" to BODY_LARGE, "SCORE" to SCORE, "PRIMARY_BUTTON" to PRIMARY_BUTTON,
        "SECONDARY_LABEL" to SECONDARY_LABEL, "NAVIGATION" to NAVIGATION, "METADATA" to METADATA
    )

    fun lineHeight(size: Float, ratio: Float, devanagari: Boolean): Float =
        size * (ratio + if (devanagari) DEVANAGARI_EXTRA else 0f)
}
