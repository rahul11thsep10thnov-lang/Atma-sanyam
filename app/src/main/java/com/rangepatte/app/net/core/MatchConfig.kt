package com.rangepatte.app.net.core

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import kotlin.random.Random

/**
 * Everything every phone must agree on before a table starts: which game, who sits where, which
 * seats are people (the rest are computer players) and the random [seed]. With the same config and
 * the same list of moves, every phone ends up with exactly the same game.
 *
 * Seat 0 is always the host (the phone that created the table).
 */
data class MatchConfig(
    val gameId: GameId,
    val seatNames: List<String>,
    val humanSeats: Set<Int>,
    val difficulty: AiDifficulty,
    val seed: Long
) {
    val seats: Int get() = seatNames.size
}

/** The random numbers for step [seq] of a match — identical on every phone, different at every step. */
fun randomFor(seed: Long, seq: Int): Random = Random(seed * 1_000_003L + seq)
