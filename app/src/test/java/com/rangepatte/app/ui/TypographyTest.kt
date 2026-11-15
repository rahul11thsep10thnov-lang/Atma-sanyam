package com.rangepatte.app.ui

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
}
