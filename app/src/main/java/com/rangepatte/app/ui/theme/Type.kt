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
 * All sizes below are 2sp larger than the original design scale, per the owner's request for
 * bigger text everywhere. Indic scripts fall back to the platform's Noto fonts automatically.
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
        fontSize = 40.sp,
        lineHeight = 48.sp,
        letterSpacing = 1.sp
    ),
    headlineLarge = TextStyle(
        fontFamily = DisplayFont,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        lineHeight = 38.sp,
        letterSpacing = 0.5.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = DisplayFont,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
        letterSpacing = 0.5.sp
    ),
    titleLarge = TextStyle(
        fontFamily = TitleFont,
        fontWeight = FontWeight.Normal,
        fontSize = 23.sp,
        lineHeight = 30.sp
    ),
    titleMedium = TextStyle(
        fontFamily = TitleFont,
        fontWeight = FontWeight.Normal,
        fontSize = 19.sp,
        lineHeight = 26.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp,
        lineHeight = 26.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    labelLarge = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    labelMedium = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 18.sp
    ),
    // The remaining Material roles (used inside text fields, chips etc.), also +2sp over Material's defaults.
    titleSmall = TextStyle(
        fontFamily = TitleFont,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    bodySmall = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 18.sp
    ),
    labelSmall = TextStyle(
        fontFamily = BodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        lineHeight = 17.sp
    )
)

/** Small-caps carved-inscription style for panel titles (e.g. "OPTIONS", "SELECT LANGUAGE"). */
val RoyalTitleStyle = TextStyle(
    fontFamily = DisplayFont,
    fontWeight = FontWeight.Bold,
    fontSize = 21.sp,
    lineHeight = 28.sp,
    letterSpacing = 1.8.sp
)

/** Compact small-caps style for buttons, plaques and option-row labels. */
val RoyalLabelStyle = TextStyle(
    fontFamily = DisplayFont,
    fontWeight = FontWeight.Bold,
    fontSize = 15.sp,
    lineHeight = 20.sp,
    letterSpacing = 1.2.sp
)
