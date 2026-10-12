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
    companion object {
        val DEFAULT = LudoRules()
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
