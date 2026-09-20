package com.rangepatte.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Design-token palette — Indian village-courtyard / royal-darbar aesthetic: charpai wood, jute
 * rope, antique brass and gold, deep maroon and saffron. Every screen and component pulls color
 * from these tokens (or from [RangEPatteTheme]'s derived Material3 scheme) rather than inlining
 * hex values, so the whole theme can be re-tuned from this one file.
 */

// ---- Primary palette tokens (as named in the design brief) -------------------------------

val PrimaryMaroon = Color(0xFF6B1421)
val RoyalRed = Color(0xFF8A1F2B)
val RoyalGold = Color(0xFFD4AF37)
val AntiqueGoldToken = Color(0xFFB4822E)
val Saffron = Color(0xFFE08A2C)
val MustardYellow = Color(0xFFD9A441)
val Terracotta = Color(0xFFB5613C)
val WoodBrown = Color(0xFF5A3E2B)
val CharpaiBrown = Color(0xFF6B4A34)
val JuteBeige = Color(0xFFD9C6A0)
val ParchmentCream = Color(0xFFF3E9D7)
val DeepGreenToken = Color(0xFF3D4F32)
val RoyalIndigo = Color(0xFF2E3A5C)
val Cream = Color(0xFFFBF6EC)
val Ivory = Color(0xFFFBF3E3)

// ---- Derived roles (semantic aliases used across the app; kept stable so existing call
// sites don't need to change when the underlying palette is retuned) -----------------------

// Base surfaces
val IvoryBackground = Cream
val ParchmentSurface = ParchmentCream
val ParchmentSurfaceDim = Color(0xFFE9DCC3)
val DeepBrown = Color(0xFF3B2A20)
val WarmBrown = WoodBrown

// Accents
val AntiqueGold = AntiqueGoldToken
val AntiqueGoldDark = Color(0xFF8F6423)
val HeritageBurgundy = PrimaryMaroon
val MutedGreen = DeepGreenToken
val MutedGreenDark = Color(0xFF2A3624)

// Text
val TextPrimaryLight = Color(0xFF2A1E16)
val TextSecondaryLight = Color(0xFF6E5C4C)
val TextPrimaryDark = ParchmentCream
val TextSecondaryDark = Color(0xFFCBB99E)

// Dark theme surfaces (a dim, lantern-lit courtyard rather than pure black)
val DarkBackground = Color(0xFF241A14)
val DarkSurface = Color(0xFF2E2119)
val DarkSurfaceDim = Color(0xFF241A14)

// Card-face tones (used by the card renderer, independent of app theme)
val CardIvory = Ivory
val CardInkRed = Color(0xFF8B2B2B)
val CardInkBlack = Color(0xFF2A1E16)
val CardBorderGold = AntiqueGoldToken

// Ornamentation & glow (selection highlight, flourishes, plaques)
val GoldenGlow = Color(0xFFF5C542)
val BrassLight = Color(0xFFC9A24B)
val BrassDark = Color(0xFF7A5A22)
