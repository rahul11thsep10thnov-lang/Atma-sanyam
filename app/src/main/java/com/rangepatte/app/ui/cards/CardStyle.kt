package com.rangepatte.app.ui.cards

import androidx.compose.ui.graphics.Color
import com.rangepatte.app.ui.theme.AntiqueGoldDark
import com.rangepatte.app.ui.theme.CardIvory
import com.rangepatte.app.ui.theme.CardInkBlack
import com.rangepatte.app.ui.theme.CardInkRed
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.HeritageBurgundy
import com.rangepatte.app.ui.theme.PrimaryMaroon
import com.rangepatte.app.ui.theme.RoyalGold

/** Selectable card-face appearances (Settings -> Card style). Geometry never changes, only paint. */
enum class CardStyle {
    CLASSICAL_IVORY,
    HERITAGE_RED,
    MINIMAL_VINTAGE
}

/**
 * Paint tokens for one card style. [frameInnerColor] draws the thin inner rule of the antique
 * double-border frame; [faceCardAccent] tints the King/Queen/Jack crest ornament.
 */
data class CardPalette(
    val faceColor: Color,
    val borderColor: Color,
    val frameInnerColor: Color,
    val redInk: Color,
    val blackInk: Color,
    val faceCardAccent: Color,
    val backBase: Color,
    val backOrnament: Color
)

fun CardStyle.palette(): CardPalette = when (this) {
    CardStyle.CLASSICAL_IVORY -> CardPalette(
        faceColor = CardIvory,
        borderColor = RoyalGold,
        frameInnerColor = AntiqueGoldDark,
        redInk = CardInkRed,
        blackInk = CardInkBlack,
        faceCardAccent = RoyalGold,
        backBase = PrimaryMaroon,
        backOrnament = RoyalGold
    )
    CardStyle.HERITAGE_RED -> CardPalette(
        faceColor = Color(0xFFF6E9DE),
        borderColor = HeritageBurgundy,
        frameInnerColor = Color(0xFFB4822E),
        redInk = HeritageBurgundy,
        blackInk = CardInkBlack,
        faceCardAccent = GoldenGlow,
        backBase = Color(0xFF5A1F27),
        backOrnament = Color(0xFFE3C68A)
    )
    CardStyle.MINIMAL_VINTAGE -> CardPalette(
        faceColor = Color(0xFFF4F1E8),
        borderColor = Color(0xFF8A8272),
        frameInnerColor = Color(0xFFAFA48A),
        redInk = Color(0xFF7A3B3B),
        blackInk = Color(0xFF33312B),
        faceCardAccent = Color(0xFF8A8272),
        backBase = Color(0xFF3E3B33),
        backOrnament = Color(0xFFBFB69B)
    )
}
