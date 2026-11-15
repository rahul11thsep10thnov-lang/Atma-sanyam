package com.rangepatte.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.ui.language.LocalAppLanguage

/**
 * The app's typography: one set of semantic text styles ([AppType]) that every screen uses, plus the
 * Material [Typography] built from the same styles.
 *
 * Fonts (all bundled locally, SIL OFL 1.1 — see THIRD_PARTY_NOTICES.md, no runtime download):
 *  - Cinzel Bold ........ the app brand only (English)
 *  - Marcellus Regular .. heritage section headings (English)
 *  - Noto Sans .......... English interface and gameplay (Regular / Medium / SemiBold / Bold)
 *  - Noto Sans Devanagari  every Hindi and Marathi string (Regular / Medium / SemiBold / Bold)
 * The Devanagari files carry the Latin letters too, so a Hindi screen with an English name in it keeps
 * one consistent weight. Other Indian scripts (Tamil, Telugu, Kannada, Bengali, Punjabi) use Noto Sans
 * for Latin text and Android's own Noto fonts for their script.
 *
 * Sizes live in [TypeScale]. Letter-spacing is applied only to the English brand: spacing breaks
 * Devanagari conjuncts and matras apart. Line heights are taller for Devanagari so nothing is clipped.
 */
private val NotoSans = FontFamily(
    Font(R.font.noto_sans_regular, FontWeight.Normal),
    Font(R.font.noto_sans_medium, FontWeight.Medium),
    Font(R.font.noto_sans_semibold, FontWeight.SemiBold),
    Font(R.font.noto_sans_bold, FontWeight.Bold)
)
private val NotoSansDevanagari = FontFamily(
    Font(R.font.noto_sans_devanagari_regular, FontWeight.Normal),
    Font(R.font.noto_sans_devanagari_medium, FontWeight.Medium),
    Font(R.font.noto_sans_devanagari_semibold, FontWeight.SemiBold),
    Font(R.font.noto_sans_devanagari_bold, FontWeight.Bold)
)
// Cinzel is a variable font (registered 'wght' axis); declaring both weights against the same file lets
// the platform pick the instance — no experimental FontVariation API needed.
private val Cinzel = FontFamily(
    Font(R.font.cinzel_variable, weight = FontWeight.Normal),
    Font(R.font.cinzel_variable, weight = FontWeight.Bold)
)
private val Marcellus = FontFamily(Font(R.font.marcellus_regular, weight = FontWeight.Normal))

/** Which fonts a language uses for the brand, headings and everything else. */
internal enum class FontSet(
    val brand: FontFamily,
    val brandSpacing: Float,
    val heading: FontFamily,
    val headingWeight: FontWeight,
    val ui: FontFamily,
    val devanagari: Boolean
) {
    ENGLISH(Cinzel, 1f, Marcellus, FontWeight.Normal, NotoSans, false),
    DEVANAGARI(NotoSansDevanagari, 0f, NotoSansDevanagari, FontWeight.SemiBold, NotoSansDevanagari, true),
    OTHER(NotoSans, 0f, NotoSans, FontWeight.SemiBold, NotoSans, false);

    companion object {
        fun of(language: AppLanguage): FontSet = when (language) {
            AppLanguage.ENGLISH -> ENGLISH
            AppLanguage.HINDI, AppLanguage.MARATHI -> DEVANAGARI
            else -> OTHER
        }
    }
}

/** The semantic text styles, built once per font set. */
class TypeTokens internal constructor(private val fonts: FontSet) {
    private fun make(
        family: FontFamily, weight: FontWeight, size: Float, ratio: Float,
        letterSpacing: Float = 0f, tabular: Boolean = false
    ) = TextStyle(
        fontFamily = family,
        fontWeight = weight,
        fontSize = size.sp,
        lineHeight = TypeScale.lineHeight(size, ratio, fonts.devanagari).sp,
        letterSpacing = letterSpacing.sp,
        fontFeatureSettings = if (tabular) "tnum" else null
    )

    val brandDisplay = make(fonts.brand, FontWeight.Bold, TypeScale.BRAND, 1.2f, fonts.brandSpacing)
    val screenTitle = make(fonts.ui, FontWeight.SemiBold, TypeScale.SCREEN_TITLE, TypeScale.LINE_TITLE)
    val sectionTitle = make(fonts.heading, fonts.headingWeight, TypeScale.SECTION_TITLE, TypeScale.LINE_TITLE)
    val gameTitle = make(fonts.ui, FontWeight.Bold, TypeScale.GAME_TITLE, TypeScale.LINE_TITLE)
    val playerName = make(fonts.ui, FontWeight.SemiBold, TypeScale.PLAYER_NAME, TypeScale.LINE_TITLE)
    val playerNameCompact = make(fonts.ui, FontWeight.SemiBold, TypeScale.PLAYER_NAME_COMPACT, TypeScale.LINE_TITLE)
    val bodyText = make(fonts.ui, FontWeight.Normal, TypeScale.BODY, TypeScale.LINE_BODY)
    val bodyLarge = make(fonts.ui, FontWeight.Normal, TypeScale.BODY_LARGE, TypeScale.LINE_BODY)
    val gameplayText = make(fonts.ui, FontWeight.Medium, TypeScale.BODY, TypeScale.LINE_BODY)
    val scoreText = make(fonts.ui, FontWeight.SemiBold, TypeScale.SCORE, TypeScale.LINE_TITLE, tabular = true)
    val primaryButton = make(fonts.ui, FontWeight.SemiBold, TypeScale.PRIMARY_BUTTON, TypeScale.LINE_TITLE)
    val secondaryLabel = make(fonts.ui, FontWeight.Medium, TypeScale.SECONDARY_LABEL, TypeScale.LINE_LABEL)
    val navigationLabel = make(fonts.ui, FontWeight.Medium, TypeScale.NAVIGATION, TypeScale.LINE_LABEL)
    val metadata = make(fonts.ui, FontWeight.Medium, TypeScale.METADATA, TypeScale.LINE_LABEL, tabular = true)

    /** Plain numbers for codes and timers entered or shown in a fixed width (room code, OTP). */
    val codeDigits = make(fonts.ui, FontWeight.SemiBold, TypeScale.SCORE, TypeScale.LINE_TITLE, tabular = true)

    /** Material roles the library's own components (text fields, dialogs, chips) read. */
    fun toMaterial() = Typography(
        displayLarge = brandDisplay,
        displayMedium = sectionTitle,
        displaySmall = sectionTitle,
        headlineLarge = sectionTitle,
        headlineMedium = sectionTitle,
        headlineSmall = screenTitle,
        titleLarge = screenTitle,
        titleMedium = playerName,
        titleSmall = playerName,
        bodyLarge = bodyLarge,
        bodyMedium = bodyText,
        bodySmall = secondaryLabel,
        labelLarge = primaryButton,
        labelMedium = secondaryLabel,
        labelSmall = metadata
    )
}

/** The text styles for the language the UI is currently shown in. */
@Composable
fun typeTokens(): TypeTokens {
    val fonts = FontSet.of(LocalAppLanguage.current)
    return remember(fonts) { TypeTokens(fonts) }
}

/**
 * The semantic styles, read in any composable: `Text(name, style = AppType.GameTitle)`.
 * Use these instead of writing `fontSize = …sp` in a screen.
 */
object AppType {
    val BrandDisplay: TextStyle @Composable get() = typeTokens().brandDisplay
    val ScreenTitle: TextStyle @Composable get() = typeTokens().screenTitle
    val SectionTitle: TextStyle @Composable get() = typeTokens().sectionTitle
    val GameTitle: TextStyle @Composable get() = typeTokens().gameTitle
    val PlayerName: TextStyle @Composable get() = typeTokens().playerName
    val PlayerNameCompact: TextStyle @Composable get() = typeTokens().playerNameCompact
    val BodyText: TextStyle @Composable get() = typeTokens().bodyText
    val GameplayText: TextStyle @Composable get() = typeTokens().gameplayText
    val ScoreText: TextStyle @Composable get() = typeTokens().scoreText
    val PrimaryButton: TextStyle @Composable get() = typeTokens().primaryButton
    val SecondaryLabel: TextStyle @Composable get() = typeTokens().secondaryLabel
    val NavigationLabel: TextStyle @Composable get() = typeTokens().navigationLabel
    val Metadata: TextStyle @Composable get() = typeTokens().metadata
    val CodeDigits: TextStyle @Composable get() = typeTokens().codeDigits
}

// ---- Older names, kept so existing screens keep compiling; they now resolve to the tokens above ----

/** Panel and dialog titles (the old carved-inscription style) — now the section heading. */
val RoyalTitleStyle: TextStyle @Composable get() = AppType.SectionTitle

/** Buttons, plaques and option labels — now the primary-button style. */
val RoyalLabelStyle: TextStyle @Composable get() = AppType.PrimaryButton

/** Body font for informational text — now the body style (kept for the few places that still name it). */
val BodyFont: TextStyle @Composable get() = AppType.BodyText

/** Material typography for the current language; used by [RangEPatteTheme]. */
@Composable
fun rememberAppTypography(): Typography {
    val tokens = typeTokens()
    return remember(tokens) { tokens.toMaterial() }
}
