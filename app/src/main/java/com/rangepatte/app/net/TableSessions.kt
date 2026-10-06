package com.rangepatte.app.net

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.common.AI_NAMES
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

/**
 * Hands a table from where it was set up to the screen that plays it. A lobby (people joining over
 * Bluetooth/Wi-Fi or the internet) builds the session, [offer]s it, and navigates to the table, which
 * [take]s it. When nobody offered one, the table is a solo game against the computer.
 */
object TableSessions {
    private var pending: GameSession<*, *>? = null

    fun offer(session: GameSession<*, *>) {
        pending = session
    }

    fun take(): GameSession<*, *>? = pending.also { pending = null }

    /** Rummy and Teen Patti seat 2–6 (the chosen count); the trick-taking games always seat four. */
    fun seatsFor(gameId: GameId, playerCount: Int): Int =
        if (gameId == GameId.RUMMY || gameId == GameId.TEEN_PATTI) playerCount else 4

    /** A solo table: you at seat 0 ([youName]) and computer players in the other seats. */
    fun solo(gameId: GameId, playerCount: Int, difficulty: AiDifficulty, youName: String): GameSession<*, *> {
        val machine = checkNotNull(GameMachines.forGame(gameId)) { "$gameId has no multiplayer machine" }
        val seats = seatsFor(gameId, playerCount)
        val names = listOf(youName) + AI_NAMES.take(seats - 1)
        return GameSession.solo(machine, MatchConfig(gameId, names, setOf(0), difficulty, Random.nextLong()))
    }
}
