package com.rangepatte.app.ui

import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.components.gameGridColumns
import com.rangepatte.app.ui.theme.TypeScale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Guards the typography brief: every token inside its allowed range, game names at 20–22 sp, no stray sizes. */
class TypographyTest {
    @Test
    fun everyTokenIsInsideItsRange() {
        assertEquals(TypeScale.ranges.keys, TypeScale.sizes.keys)
        for ((name, size) in TypeScale.sizes) {
            val range = TypeScale.ranges.getValue(name)
            assertTrue("$name = $size is outside $range", size in range)
        }
    }

    @Test
    fun gameNamesAreTwentyToTwentyTwoSp() {
        assertTrue(TypeScale.GAME_TITLE in 20f..22f)
    }

    @Test
    fun nothingIsSmallerThanTheMinimum() {
        assertTrue(TypeScale.sizes.values.all { it >= TypeScale.MINIMUM })
    }

    @Test
    fun brandIsThirtyTwoToThirtySixSp() {
        assertTrue(TypeScale.BRAND in 32f..36f)
    }

    @Test
    fun devanagariGetsTallerLines() {
        val latin = TypeScale.lineHeight(15f, TypeScale.LINE_BODY, devanagari = false)
        val hindi = TypeScale.lineHeight(15f, TypeScale.LINE_BODY, devanagari = true)
        assertTrue(hindi > latin)
    }

    private fun sourceFiles(): List<File> {
        val root = listOf(File("src/main/java"), File("app/src/main/java")).first { it.exists() }
        return root.walkTopDown().filter { it.extension == "kt" }.toList()
    }

    /** Sizes are typed only in the theme and for icon glyphs, emoji and board geometry. */
    @Test
    fun noStrayTextSizesInScreens() {
        val allowed = setOf(
            "TypeScale.kt", "Type.kt",
            // icon glyphs, emoji and symbols (not text): 
            "RoyalStates.kt", "PokeOverlay.kt", "MyProfileScreen.kt", "TableTalkUi.kt", "NotificationUi.kt",
            "LudoSetupScreen.kt", "LudoYardPlaques.kt",
            // code entry fields: digits shown wide with letter-spacing on top of AppType.CodeDigits
            "LoginScreen.kt", "LobbyScreen.kt"
        )
        val offenders = sourceFiles().filter { it.name !in allowed }.filter { f ->
            f.readLines().any { Regex("""fontSize = \d+(\.\d+)?\.sp""").containsMatchIn(it) }
        }.map { it.name }
        assertTrue("Hard-coded font sizes in: $offenders", offenders.isEmpty())
    }

    @Test
    fun gameTilesUseTheGameTitleStyle() {
        val tile = sourceFiles().first { it.name == "GameTile.kt" }.readText()
        assertTrue(tile.contains("AppType.GameTitle"))
        assertTrue("game names must not be forced to capitals", !tile.contains("text.uppercase()"))
    }

    /** Text may step down to fit, but never below these floors (and game names never below 15 sp). */
    @Test
    fun fitFloorsAreSensible() {
        assertTrue(TypeScale.GAME_TITLE_MIN >= 15f && TypeScale.GAME_TITLE_MIN < TypeScale.GAME_TITLE)
        assertTrue(TypeScale.NAVIGATION_MIN >= 10f && TypeScale.NAVIGATION_MIN <= TypeScale.NAVIGATION)
        assertTrue(TypeScale.TABLE_HEADER_MIN >= 9f && TypeScale.TABLE_HEADER_MIN <= TypeScale.METADATA)
    }

    /** Phones get two columns; very large system font sizes fall back to one; tablets get more. */
    @Test
    fun gridColumnsFollowWidthAndFontScale() {
        assertEquals(2, gameGridColumns(360.dp, 1f))
        assertEquals(2, gameGridColumns(320.dp, 1f))
        assertEquals(2, gameGridColumns(360.dp, 1.3f))
        assertEquals(1, gameGridColumns(360.dp, 2f))
        assertEquals(1, gameGridColumns(320.dp, 1.5f))
        assertEquals(3, gameGridColumns(700.dp, 1f))
        assertEquals(4, gameGridColumns(1000.dp, 1f))
        assertEquals(2, gameGridColumns(700.dp, 2f))
        assertEquals(2, gameGridColumns(360.dp, 0.85f))
    }
}
