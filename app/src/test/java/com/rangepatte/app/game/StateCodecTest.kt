package com.rangepatte.app.game

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.coatpiece.CpState
import com.rangepatte.app.game.dehlapakad.DpState
import com.rangepatte.app.game.lakadi.LkState
import com.rangepatte.app.game.rummy.RummyState
import com.rangepatte.app.game.rummy.isHidden
import com.rangepatte.app.game.teenpatti.TpState
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.twentynine.T9State
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SessionCore
import com.rangepatte.app.net.core.isHidden
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Every game's state survives the trip to text and back, and a redacted view shows no hidden card. */
class StateCodecTest {
    private fun <S, A> walk(machine: GameMachine<S, A>, seed: Long, steps: Int, visit: (S) -> Unit) {
        val seats = if (machine.gameId == GameId.RUMMY) 3 else 4
        val core = SessionCore(machine, MatchConfig(machine.gameId, List(seats) { "P$it" }, setOf(0), AiDifficulty.MEDIUM, seed), 0, true)
        val random = Random(seed)
        repeat(steps) {
            visit(core.state)
            if (core.hasAutoStep()) { core.autoStep(); return@repeat }
            val seat = machine.seatToAct(core.state) ?: return
            core.hostAccept(seat, machine.decideForBot(core.state, seat, AiDifficulty.MEDIUM, random) ?: return)
        }
    }

    @Test fun everyStateRoundTrips() {
        for (id in GameMachines.multiplayerGames) {
            val machine = GameMachines.forGame(id)!!
            var count = 0
            walk(machine, 7, 400) { state ->
                val text = machine.encodeState(state)
                assertEquals("$id at step $count", state, machine.decodeState(text))
                count++
            }
            assertTrue(count > 50)
        }
    }

    @Test fun spectatorViewHidesEveryHandAndStillRoundTrips() {
        for (id in GameMachines.multiplayerGames) {
            val machine = GameMachines.forGame(id)!!
            walk(machine, 3, 150) { state ->
                val view = machine.redact(state, null)
                assertEquals(view, machine.decodeState(machine.encodeState(view)))
                assertNoVisibleHand(id, view)
                // A seated player sees exactly their own hand.
                val mine = machine.redact(state, 0)
                assertOwnHandVisible(id, state, mine)
            }
        }
    }

    private fun assertNoVisibleHand(id: GameId, view: Any?) {
        when (view) {
            is TpState -> if (view.result?.showdown != true) view.seats.forEach { s -> s.hand.forEach { assertTrue("$id", it.isHidden) } }
            is RummyState -> if (view.result == null) view.players.forEach { p -> p.hand.forEach { assertTrue("$id", it.isHidden) } }
            else -> rounds(view).forEach { r -> r.hands.forEach { h -> h.forEach { assertTrue("$id", it.isHidden) } } }
        }
    }

    private fun assertOwnHandVisible(id: GameId, full: Any?, mine: Any?) {
        when (mine) {
            is TpState -> { assertEquals((full as TpState).seats[0].hand, mine.seats[0].hand); if (mine.result?.showdown != true && mine.seats.size > 1) mine.seats[1].hand.forEach { assertTrue(it.isHidden) } }
            is RummyState -> { assertEquals((full as RummyState).players[0].hand, mine.players[0].hand); if (mine.result == null) mine.players[1].hand.forEach { assertTrue(it.isHidden) } }
            else -> rounds(mine).zip(rounds(full)).forEach { (m, f) -> assertEquals("$id", f.hands[0], m.hands[0]); m.hands[1].forEach { assertTrue(it.isHidden) } }
        }
    }

    private fun rounds(state: Any?): List<TrickRound> = when (state) {
        is CpState -> listOf(state.round)
        is T9State -> listOfNotNull(state.round)
        is DpState -> listOf(state.round)
        is LkState -> listOf(state.round)
        else -> emptyList()
    }

    @Test fun hiddenCardsCarryNoInformation() {
        val machine = GameMachines.forGame(GameId.COAT_PIECE)!!
        walk(machine, 9, 20) { state ->
            val view = machine.redact(state, null)
            val ids = rounds(view).flatMap { it.hands.flatten() }.map { it.id }.toSet()
            assertFalse(ids.any { it != "hidden" })
        }
    }
}
