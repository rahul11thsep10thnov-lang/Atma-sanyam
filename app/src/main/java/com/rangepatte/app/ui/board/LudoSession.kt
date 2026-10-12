package com.rangepatte.app.ui.board

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoSetup
import com.rangepatte.app.domain.ludo.LudoState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.security.SecureRandom
import kotlin.random.Random
import kotlin.random.asKotlinRandom

/**
 * A solo Ludo table (stage 3): you at seat 0, the computer in the other seats. Dice come from a
 * secure random source; the engine decides everything else. The multiplayer session arrives with the
 * lobby stage, built on the same engine the way the card tables are.
 */
class LudoSession(setup: LudoSetup, youName: String, botNames: List<String>) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val dice = SecureRandom().asKotlinRandom()
    private val random = Random(dice.nextLong())
    val difficulty = setup.difficulty
    val mySeat = 0

    var state: LudoState by mutableStateOf(LudoEngine.newGame(listOf(youName) + botNames.take(setup.players - 1), setup.rules))
        private set

    /** The last dice value shown on the die (kept while the player chooses a token). */
    var shownDice: Int? by mutableStateOf(null)
        private set

    val isMyTurn: Boolean get() = state.turn == mySeat && state.phase != LudoPhase.OVER

    fun start() { scope.launch { runBots() } }

    fun roll() {
        if (!isMyTurn || state.phase != LudoPhase.ROLL) return
        val value = dice.nextInt(1, 7)
        LudoEngine.roll(state, value)?.let { state = it; shownDice = value }
    }

    fun move(token: Int) {
        if (!isMyTurn || state.phase != LudoPhase.MOVE) return
        LudoEngine.move(state, token)?.let { state = it }
    }

    private suspend fun runBots() {
        while (state.phase != LudoPhase.OVER) {
            if (state.turn != mySeat) {
                delay(700)
                when (state.phase) {
                    LudoPhase.ROLL -> { val v = dice.nextInt(1, 7); LudoEngine.roll(state, v)?.let { state = it; shownDice = v } }
                    LudoPhase.MOVE -> { delay(500); LudoEngine.chooseToken(state, difficulty, random)?.let { t -> LudoEngine.move(state, t)?.let { state = it } } }
                    LudoPhase.OVER -> Unit
                }
            } else delay(150)
        }
    }

    fun close() { scope.cancel() }
}
