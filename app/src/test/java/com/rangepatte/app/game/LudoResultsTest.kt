package com.rangepatte.app.game

import com.rangepatte.app.domain.ludo.LudoAction
import com.rangepatte.app.domain.ludo.LudoBoard
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoRecord
import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.ludo.LudoMachine
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SessionCore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Ludo stage 10: the engine's match statistics, the final order, the rematch and the lifetime record. */
class LudoResultsTest {
    @Test fun theEngineCountsTurnsSixesCapturesAndLosses() {
        var s = LudoEngine.newGame(listOf("A", "B"))
        s = LudoEngine.move(LudoEngine.roll(s, 6)!!, 0)!!
        assertEquals(1, s.statsOf(0).turns); assertEquals(1, s.statsOf(0).sixes)
        // B sits where A's next move lands: relative 14 for A is absolute 14; for B that is relative 40.
        s = s.copy(turn = 0, phase = LudoPhase.ROLL, sixStreak = 0,
            players = s.players.mapIndexed { i, p -> if (i == 0) p.copy(tokens = listOf(10, -1, -1, -1)) else p.copy(tokens = listOf(40, -1, -1, -1)) })
        s = LudoEngine.move(LudoEngine.roll(s, 4)!!, 0)!!
        assertEquals(1, s.statsOf(0).captures); assertEquals(1, s.statsOf(1).lost); assertEquals(2, s.statsOf(0).turns)
        assertEquals(0, s.statsOf(1).turns)
    }

    @Test fun theFinalOrderRanksTheRestByTokensHomeThenProgress() {
        var s = LudoEngine.newGame(listOf("A", "B", "C"), LudoRules(playOnForPlaces = false))
        s = s.copy(players = s.players.mapIndexed { i, p -> p.copy(tokens = when (i) {
            0 -> listOf(LudoBoard.LAST_TRACK, LudoBoard.HOME, LudoBoard.HOME, LudoBoard.HOME)
            1 -> listOf(3, -1, -1, -1)
            else -> listOf(LudoBoard.HOME, 20, -1, -1)
        }) })
        val over = LudoEngine.move(LudoEngine.roll(s, 6)!!, 0)!!
        assertEquals(LudoPhase.OVER, over.phase)
        assertEquals(listOf(0, 2, 1), over.places)
    }

    @Test fun onlyTheHostRestartsAndOnlyWhenTheMatchIsOver() {
        val cfg = MatchConfig(GameId.LUDO, listOf("Host", "Anita"), setOf(0, 1), AiDifficulty.MEDIUM, 4, LudoRules(sixToEnter = false).encode())
        val host = SessionCore(LudoMachine, cfg, 0, isHost = true)
        val guest = SessionCore(LudoMachine, cfg, 1, isHost = false)
        assertNull(host.hostAccept(0, LudoAction.Rematch))
        var steps = 0
        while (host.state.phase != LudoPhase.OVER && steps++ < 4_000) {
            val seat = LudoMachine.seatToAct(host.state)!!
            guest.receive(host.hostAccept(seat, LudoMachine.decideForBot(host.state, seat, AiDifficulty.MEDIUM, Random(steps.toLong()))!!)!!)
        }
        assertEquals(LudoPhase.OVER, host.state.phase)
        assertEquals(0, LudoMachine.seatToAct(host.state))
        assertNull(LudoMachine.decideForBot(host.state, 0, AiDifficulty.MEDIUM, Random(1)))
        assertNull(host.hostAccept(1, LudoAction.Rematch))
        val finished = host.state
        val again = host.hostAccept(0, LudoAction.Rematch)!!
        assertTrue(guest.receive(again))
        assertEquals(host.state, guest.state)
        assertEquals(LudoPhase.ROLL, host.state.phase)
        assertEquals(finished.players.map { it.name to it.color }, host.state.players.map { it.name to it.color })
        assertEquals(finished.rules, host.state.rules)
        assertTrue(host.state.players.all { it.inYard == 4 })
        assertTrue(host.state.stats.all { it.turns == 0 })
        assertEquals("N", LudoMachine.encode(LudoAction.Rematch))
        assertEquals(LudoAction.Rematch, LudoMachine.decode("N"))
        assertEquals(finished, LudoMachine.decodeState(LudoMachine.encodeState(finished)))
    }

    @Test fun theLifetimeRecordGrowsWithEachFinishedMatch() {
        var s = LudoEngine.newGame(listOf("A", "B", "C"))
        assertEquals(LudoRecord(), LudoRecord().after(s, 0)) // not over: unchanged
        s = s.copy(phase = LudoPhase.OVER, places = listOf(2, 0, 1), stats = s.stats.mapIndexed { i, st -> if (i == 0) st.copy(captures = 3) else st })
        val r = LudoRecord().after(s, 0).after(s, 0)
        assertEquals(LudoRecord(played = 2, won = 0, second = 2, third = 0, captures = 6), r)
        assertEquals(LudoRecord(played = 1, won = 1), LudoRecord().after(s, 2))
        assertEquals(r, LudoRecord.decode(r.encode()))
        assertEquals(LudoRecord(), LudoRecord.decode("garbage"))
        assertEquals(LudoRecord(), LudoRecord.decode(null))
    }
}
