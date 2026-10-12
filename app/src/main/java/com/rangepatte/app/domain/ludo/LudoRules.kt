package com.rangepatte.app.domain.ludo

/**
 * The house rules Ludo's engine offers (stage 2, approved with the page). The defaults are the
 * recommended ruleset; every switch is honoured by the rules engine (stage 3+) and shown on the
 * setup page.
 */
data class LudoRules(
    /** A token leaves its yard only on a six (off: any roll enters it). */
    val sixToEnter: Boolean = true,
    /** A six gives one more roll; three sixes in a row forfeit the turn. */
    val extraRollOnSix: Boolean = true,
    /** Capturing an opponent gives one more roll. */
    val extraRollOnCapture: Boolean = true,
    /** The last square of the home column needs the exact number. */
    val exactFinish: Boolean = true,
    /** After the first winner the others keep playing for 2nd and 3rd place (off: the match ends). */
    val playOnForPlaces: Boolean = true
) {
    /** The five switches as a line of 1s and 0s, for the lobby's [com.rangepatte.app.net.core.MatchConfig.options]. */
    fun encode(): String = listOf(sixToEnter, extraRollOnSix, extraRollOnCapture, exactFinish, playOnForPlaces).joinToString("") { if (it) "1" else "0" }

    /** True when every switch is at its recommended setting. */
    val isDefault: Boolean get() = this == DEFAULT

    companion object {
        val DEFAULT = LudoRules()

        /** The inverse of [encode]; anything malformed (an old phone, an empty field) means the defaults. */
        fun decode(text: String): LudoRules {
            if (text.length != 5 || text.any { it != '0' && it != '1' }) return DEFAULT
            fun on(i: Int) = text[i] == '1'
            return LudoRules(on(0), on(1), on(2), on(3), on(4))
        }
        /** The eight star squares are always safe; captures never happen on them. */
        const val SAFE_SQUARES_NOTE = "star squares are safe"
    }
}

/** What the setup page decided, carried to the board (stage 3) the way TableSessions carries card tables. */
data class LudoSetup(
    val players: Int = 4,
    val rules: LudoRules = LudoRules.DEFAULT,
    val difficulty: com.rangepatte.app.domain.model.AiDifficulty = com.rangepatte.app.domain.model.AiDifficulty.MEDIUM
)

object LudoSetupStore {
    var pending: LudoSetup = LudoSetup()
}
