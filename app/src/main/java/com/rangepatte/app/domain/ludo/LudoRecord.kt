package com.rangepatte.app.domain.ludo

/** A player's lifetime Ludo record on this phone (stage 10), per signed-in account. */
data class LudoRecord(
    val played: Int = 0,
    val won: Int = 0,
    val second: Int = 0,
    val third: Int = 0,
    val captures: Int = 0
) {
    /** The record after a finished match in which this phone sat at [seat]; unchanged if the match is not over. */
    fun after(state: LudoState, seat: Int): LudoRecord {
        if (state.phase != LudoPhase.OVER || seat !in state.players.indices) return this
        val place = state.places.indexOf(seat) + 1
        return copy(
            played = played + 1,
            won = won + (if (place == 1) 1 else 0),
            second = second + (if (place == 2) 1 else 0),
            third = third + (if (place == 3) 1 else 0),
            captures = captures + state.statsOf(seat).captures
        )
    }

    fun encode(): String = listOf(played, won, second, third, captures).joinToString(",")

    companion object {
        fun decode(text: String?): LudoRecord {
            val p = text?.split(",")?.map { it.toIntOrNull() } ?: return LudoRecord()
            if (p.size != 5 || p.any { it == null }) return LudoRecord()
            return LudoRecord(p[0]!!, p[1]!!, p[2]!!, p[3]!!, p[4]!!)
        }
    }
}
