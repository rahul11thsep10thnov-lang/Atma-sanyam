package com.rangepatte.app.game

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.coatpiece.CpState
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SessionCore
import com.rangepatte.app.net.core.Wire
import com.rangepatte.app.net.core.isHidden
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/**
 * Element 10: a phone that arrives mid-game watches a redacted copy of the table, then takes a
 * computer seat when the round ends and follows the lockstep from there — for every game.
 */
class SpectatorCoreTest {
    private fun <S, A> play(host: SessionCore<S, A>, random: Random): Wire.Do? {
        if (host.hasAutoStep()) { host.autoStep(); return null }
        val seat = host.machine.seatToAct(host.state) ?: return null
        val action = host.machine.decideForBot(host.state, seat, AiDifficulty.MEDIUM, random) ?: return null
        return host.hostAccept(seat, action)
    }

    private fun <S, A> runGame(machine: GameMachine<S, A>) {
        val seats = if (machine.gameId == GameId.RUMMY) 3 else 4
        val config = MatchConfig(machine.gameId, List(seats) { "P$it" }, setOf(0, 1), AiDifficulty.MEDIUM, 42L)
        val host = SessionCore(machine, config, 0, true)
        val player = SessionCore(machine, config, 1, false)
        val random = Random(1)

        // Half a round in, a watcher arrives. It gets a blank seed and a view with every hand hidden.
        repeat(6) { play(host, random)?.let { player.receive(it) } }
        val watcher = SessionCore(machine, config.copy(seed = 0L), SessionCore.SPECTATOR, false)
        assertTrue(watcher.isSpectator)
        assertFalse(watcher.hasView)
        assertTrue(watcher.adoptView(host.viewForSpectator()))
        assertTrue(watcher.hasView)
        assertEquals(host.seq, watcher.seq)
        assertEquals(machine.redact(host.state, null), watcher.state)
        // A move broadcast to players means nothing to a watcher (it cannot replay on hidden cards).
        var move: Wire.Do? = null
        var tries = 0
        while (move == null && tries++ < 20) move = play(host, random)
        if (move != null) {
            assertFalse(watcher.receive(move))
            assertTrue(player.receive(move))
            assertTrue(watcher.adoptView(host.viewForSpectator()))
            assertEquals(host.seq, watcher.seq)
        }
        // An older view never overwrites a newer one.
        assertFalse(watcher.adoptView(Wire.View(0, machine.encodeState(machine.redact(host.state, null)))))

        // Play on to the round boundary, then seat the watcher at the lowest computer seat.
        var guard = 0
        while (!machine.isRoundBoundary(host.state) && guard++ < 2_000) {
            play(host, random)?.let { player.receive(it) }
        }
        assertTrue("reached a round boundary", machine.isRoundBoundary(host.state))
        val seat = host.freeSeatForSpectator()!!
        assertEquals(2, seat)
        host.seatHuman(seat, "Zara")
        player.seatHuman(seat, "Zara")
        assertEquals("Zara", host.config.seatNames[seat])
        assertTrue(seat in host.config.humanSeats)
        assertFalse(seat in host.botSeats)
        assertTrue(watcher.takeSeat(host.seatMessage(seat)))
        assertFalse(watcher.isSpectator)
        assertEquals(seat, watcher.mySeat)
        assertEquals(config.seed, watcher.config.seed)
        assertEquals(host.state, watcher.state)
        while (player.hasAutoStep()) player.autoStep() // the player's phone clears the last trick on its own timer
        assertEquals(host.state, player.state)

        // From here the newcomer follows the lockstep like any other player, for another round.
        var moves = 0
        guard = 0
        while (moves < 40 && guard++ < 3_000) {
            play(host, random)?.let { m -> moves++; assertTrue(player.receive(m)); assertTrue(watcher.receive(m)) }
        }
        // Let every phone settle its automatic steps, then compare.
        while (player.hasAutoStep()) player.autoStep()
        while (watcher.hasAutoStep()) watcher.autoStep()
        while (host.hasAutoStep()) host.autoStep()
        assertFalse(watcher.outOfSync)
        assertEquals("${machine.gameId}", host.state, watcher.state)
        assertEquals("${machine.gameId}", host.state, player.state)
    }

    @Test fun everyGameCanBeWatchedAndJoined() {
        for (id in GameMachines.multiplayerGames) runGame(GameMachines.forGame(id)!!)
    }

    @Test fun spectatorViewHidesHandsAndSeatMessageCarriesTheRealSeed() {
        val machine = GameMachines.forGame(GameId.COAT_PIECE)!!
        val config = MatchConfig(GameId.COAT_PIECE, listOf("A", "B", "C", "D"), setOf(0), AiDifficulty.MEDIUM, 99L)
        val host = SessionCore(machine, config, 0, true)
        val view = machine.decodeState(host.viewForSpectator().state) as CpState
        view.round.hands.flatten().forEach { assertTrue(it.isHidden) }
        assertEquals(99L, host.seatMessage(1).seed)
        assertEquals(13, machine.stepsLeftInRound(host.state))
    }

    @Test fun newWireMessagesRoundTrip() {
        val view = Wire.View(7, "a|b|c|d&e f")
        assertEquals(view, Wire.decode(view.encode()))
        val seat = Wire.Seat(2, 9, -123456789L, "x|y")
        assertEquals(seat, Wire.decode(seat.encode()))
        val human = Wire.Human(3, "Zara Khan|ज़ारा")
        assertEquals(human, Wire.decode(human.encode()))
        val start = Wire.Start(MatchConfig(GameId.RUMMY, listOf("A", "B"), setOf(0), AiDifficulty.EASY, 0L), SessionCore.SPECTATOR)
        assertEquals(start, Wire.decode(start.encode()))
        assertNull(Wire.decode("VIEW|notanumber|x"))
    }

    @Test fun seatingOnlyTouchesNames() {
        val machine = GameMachines.forGame(GameId.LAKADI)!!
        val config = MatchConfig(GameId.LAKADI, listOf("A", "B", "C", "D"), setOf(0), AiDifficulty.MEDIUM, 5L)
        val core = SessionCore(machine, config, 0, true)
        val before = core.state
        core.seatHuman(3, "Zara")
        assertEquals(machine.rename(before, 3, "Zara"), core.state)
        assertEquals(listOf("A", "B", "C", "Zara"), core.config.seatNames)
        assertEquals(setOf(0, 3), core.config.humanSeats)
        core.seatHuman(9, "Nobody") // out of range: ignored
        assertEquals(4, core.config.seatNames.size)
    }
}
