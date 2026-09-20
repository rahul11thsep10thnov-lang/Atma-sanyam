package com.rangepatte.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R

/**
 * DISPLAY_FONT / TITLE_FONT / BODY_FONT tokens (design-brief section 8).
 *
 * Cinzel (~125KB) and Marcellus (~46KB) are bundled locally as static assets — real, licensed
 * (SIL OFL 1.1, see THIRD_PARTY_NOTICES.md) TrueType files, not a Google-Fonts-downloadable
 * dependency, so headings render correctly offline with no runtime fetch and minimal size impact.
 * Body/label text stays on the zero-cost platform serif for maximum legibility at small sizes —
 * bundling a third heavy font for that role wasn't worth the size against the brief's own
 * "do not unnecessarily increase application size" instruction.
 *
 * Devanagari-compatible fonts (Noto Serif Devanagari / Tiro Devanagari) are not bundled yet since
 * the app is English-only today — see README "How to add another language" for how to add one
 * alongside a values-hi/ string set without touching this file's structure.
 */
// Cinzel is a variable font (registered 'wght' axis); declaring both weights against the same
// file lets the platform's variable-font instancing pick the right instance along that axis —
// no experimental FontVariation API needed.
private val CinzelBold = FontFamily(
    Font(R.font.cinzel_variable, weight = FontWeight.Normal),
    Font(R.font.cinzel_variable, weight = FontWeight.Bold)
)
private val Marcellus = FontFamily(Font(R.font.marcellus_regular, weight = FontWeight.Normal))

/** DISPLAY_FONT — ornate carved-inscription look for the game title and section headers. */
val DisplayFont: FontFamily = CinzelBold

/** TITLE_FONT — a calmer classical serif for buttons, player names, dialog/titleLarge text. */
val TitleFont: FontFamily = Marcellus

/** BODY_FONT — highly readable serif for scores, card values, settings and small information. */
val BodyFont: FontFamily = FontFamily.Serif

val RangEPatteTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = DisplayFont,
        fontWeight = FontWeight.Bold,
        fontSize = 38.sp,
        lineHeight = 46.sp,
        letterSpacing = 1.sp
    ),
    headlineLarge = TextStyle(
        fontFamily = DisplayFont,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 36.sp,
        letterSpacing = 0.5.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = DisplayFont,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 30.sp,
        letterSpacing = 0.5.sp
    ),
    titleLarge = TextStyle(
        fontFamily = TitleFont,
        fontWeight = FontWeight.Normal,
        fontSize = 21.sp,
        lineHeight = 28.sp
    ),
    titleMedium = TextStyle(
        fontFamily = TitleFont,
        fontWeight = FontWeight.Normal,
        fontSize = 17.sp,
        lineHeight = 24.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    labelLarge = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    labelMedium = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )
)
