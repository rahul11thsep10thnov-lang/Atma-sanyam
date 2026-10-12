package com.rangepatte.app.domain.snakes

import com.rangepatte.app.domain.model.AiDifficulty

/**
 * The house rules Moksha Patam's engine offers (stage 2, the recommended set by default). Every
 * switch is honoured by the rules engine and shown on the setup page.
 */
data class SnakesRules(
    /** A six is needed to bring the token onto the board (off: any roll enters). */
    val sixToStart: Boolean = false,
    /** A six gives one more roll. */
    val sixRollsAgain: Boolean = true,
    /** The hundredth square needs the exact number; a roll that would pass it is lost. */
    val exactFinish: Boolean = true,
    /** With the exact finish: a roll that passes 100 bounces the token back by the excess instead. */
    val bounceBack: Boolean = false,
    /** Landing on a rival sends it back to the start. */
    val captures: Boolean = false,
    /** After the first winner the others keep playing for 2nd and 3rd place (off: the match ends). */
    val playOnForPlaces: Boolean = true
) {
    fun encode(): String = listOf(sixToStart, sixRollsAgain, exactFinish, bounceBack, captures, playOnForPlaces).joinToString("") { if (it) "1" else "0" }
    val isDefault: Boolean get() = this == DEFAULT

    companion object {
        val DEFAULT = SnakesRules()
        fun decode(text: String): SnakesRules {
            if (text.length != 6 || text.any { it != '0' && it != '1' }) return DEFAULT
            fun on(i: Int) = text[i] == '1'
            return SnakesRules(on(0), on(1), on(2), on(3), on(4), on(5))
        }
    }
}

/** What the setup page decided, carried to the board the way Ludo's is. */
data class SnakesSetup(
    val players: Int = 4,
    val rules: SnakesRules = SnakesRules.DEFAULT,
    val difficulty: AiDifficulty = AiDifficulty.MEDIUM
)

object SnakesSetupStore {
    var pending: SnakesSetup = SnakesSetup()
}
