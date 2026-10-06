package com.rangepatte.app.game

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SessionCore
import com.rangepatte.app.net.core.Wire
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class MultiplayerSessionTest {

    @Test fun wireMessagesRoundTrip() {
        val config = MatchConfig(GameId.RUMMY, listOf("Ravi, the |great|", "Asha", "Gopal & Co"), setOf(0, 2), AiDifficulty.HARD, 123456789012L)
        val messages = listOf(
            Wire.Join("Priya | with, odd & chars ✓"), Wire.Reject("table full"), Wire.Lobby(listOf("A", "B,C"), 4), Wire.Lobby(emptyList()),
            Wire.Start(config, 2), Wire.Act("P:SPADES-ACE-0"), Wire.Do(17, 3, "X:42"), Wire.Bot(1), Wire.Leave
        )
        for (m in messages) assertEquals(m, Wire.decode(m.encode()))
        assertNull(Wire.decode("garbage"))
        assertNull(Wire.decode("DO|x|y|z"))
    }

    /**
     * Four simulated phones. Seat 0 is the host; seats in [humans] play by sending moves to the host
     * (we let the computer logic pick those moves, so the host's accept/refuse path is exercised); the
     * other seats are computer players on the host. After every single move all phones must hold the
     * same game, even when a phone receives its messages late and out of order.
     */
    private fun <S, A> simulate(machine: GameMachine<S, A>, humans: Set<Int>, seats: Int, seed: Long, wantRounds: Int, reorder: Boolean) {
        val config = MatchConfig(
            machine.gameId, List(seats) { "P$it" }, humans, AiDifficulty.entries[(seed % 3).toInt()], seed
        )
        val host = SessionCore(machine, config, 0, true)
        val clients = (1 until seats).filter { it in humans }.associateWith { SessionCore(machine, config, it, false) }
        val inbox = clients.keys.associateWith { ArrayDeque<Wire.Do>() }   // per-phone mailbox
        val random = Random(seed)
        var rounds = 0
        var steps = 0

        fun deliver(forceAll: Boolean) {
            for ((seat, box) in inbox) {
                // Deliver in a shuffled order, sometimes holding messages back and sometimes twice.
                val batch = box.toMutableList()
                if (reorder && !forceAll) batch.shuffle(random)
                val keep = if (reorder && !forceAll && batch.isNotEmpty() && random.nextInt(3) == 0) batch.removeAt(0) else null
                box.clear()
                keep?.let { box.addLast(it) }
                for (m in batch) { clients.getValue(seat).receive(m); if (reorder && random.nextInt(4) == 0) clients.getValue(seat).receive(m) }
            }
        }
        fun assertSame() {
            for ((seat, c) in clients) {
                assertFalse("phone $seat fell out of sync", c.outOfSync)
                if (c.seq == host.seq) assertEquals("phone $seat differs from host at move ${host.seq}", host.state, c.state)
            }
        }

        while (rounds < wantRounds && steps < 6000) {
            steps++
            if (host.hasAutoStep()) {
                // Every phone clears the finished trick by itself — no message.
                host.autoStep(); clients.values.forEach { it.autoStep() }
                continue
            }
            val seat = machine.seatToAct(host.state) ?: error("nobody to act at step $steps")
            val action = machine.decideForBot(host.state, seat, config.difficulty, random) ?: error("no move for seat $seat")
            val wasOver = action.let { machine.encode(it) } in setOf("N", "NEXT_HAND")
            // A move from the wrong seat is always refused.
            val wrongSeat = (seat + 1) % seats
            assertNull("host must refuse a move from the wrong seat", host.hostAccept(wrongSeat, action))
            val move = if (seat in clients.keys) {
                // human on another phone: encode -> ACT -> host decodes -> accepts
                val received = Wire.decode(Wire.Act(machine.encode(action)).encode()) as Wire.Act
                host.hostAccept(seat, machine.decode(received.action)!!)
            } else host.hostAccept(seat, action)
            assertNotNull("host refused a legal move by seat $seat at step $steps", move)
            val wire = Wire.decode(move!!.encode()) as Wire.Do
            inbox.values.forEach { it.addLast(wire) }
            deliver(forceAll = false)
            assertSame()
            if (wasOver) rounds++
        }
        deliver(forceAll = true)
        deliver(forceAll = true)
        assertSame()
        assertTrue("${machine.gameId}: expected $wantRounds finished rounds, got $rounds in $steps steps", rounds >= wantRounds)
        clients.values.forEach { assertEquals(host.seq, it.seq) }
    }

    @Test fun everyGameStaysInSyncAcrossFourPhones() {
        for (id in GameMachines.multiplayerGames) {
            val machine = GameMachines.forGame(id)!!
            val seats = if (id == GameId.RUMMY || id == GameId.TEEN_PATTI) 4 else 4
            for (seed in 1L..4L) {
                simulate(machine, humans = setOf(0, 1, 2, 3), seats = seats, seed = seed, wantRounds = 2, reorder = seed % 2 == 0L)
            }
        }
    }

    @Test fun humansAndComputerPlayersMixed() {
        for (id in GameMachines.multiplayerGames) {
            val machine = GameMachines.forGame(id)!!
            simulate(machine, humans = setOf(0, 2), seats = 4, seed = 11, wantRounds = 2, reorder = true)
            simulate(machine, humans = setOf(0), seats = 4, seed = 12, wantRounds = 1, reorder = false)
        }
    }

    @Test fun tableSizesForRummyAndTeenPatti() {
        simulate(GameMachines.forGame(GameId.RUMMY)!!, setOf(0, 1), seats = 2, seed = 5, wantRounds = 2, reorder = true)
        simulate(GameMachines.forGame(GameId.RUMMY)!!, setOf(0, 1, 2, 3, 4, 5), seats = 6, seed = 6, wantRounds = 1, reorder = true)
        simulate(GameMachines.forGame(GameId.TEEN_PATTI)!!, setOf(0, 1, 2), seats = 3, seed = 7, wantRounds = 3, reorder = true)
        simulate(GameMachines.forGame(GameId.TEEN_PATTI)!!, setOf(0, 1, 2, 3, 4, 5), seats = 6, seed = 8, wantRounds = 2, reorder = true)
    }

    @Test fun hostRefusesIllegalMovesAndLateOrDuplicateMessagesAreHarmless() {
        val machine = GameMachines.forGame(GameId.COAT_PIECE)!!
        val config = MatchConfig(GameId.COAT_PIECE, List(4) { "P$it" }, setOf(0, 1), AiDifficulty.MEDIUM, 99)
        val host = SessionCore(machine, config, 0, true)
        val client = SessionCore(machine, config, 1, false)
        // garbage and a play that is not allowed in the trump-call phase
        assertNull(host.hostAccept(0, machine.decode("P:SPADES-ACE-0")!!))
        assertNull(host.hostAccept(0, machine.decode("N")!!))
        val first = host.hostAccept(0, machine.decodeOrFail("T:HEARTS"))!!
        // duplicate and future messages
        assertFalse(client.receive(Wire.Do(5, 0, "P:SPADES-ACE-0")))
        assertTrue(client.receive(first))
        assertFalse(client.receive(first))
        assertEquals(host.state, client.state)
        assertEquals(1, client.seq)
    }

    @Test fun aClientThatReceivesAnImpossibleMoveIsFlaggedOutOfSync() {
        val machine = GameMachines.forGame(GameId.LAKADI)!!
        val config = MatchConfig(GameId.LAKADI, List(4) { "P$it" }, setOf(0, 1), AiDifficulty.MEDIUM, 3)
        val client = SessionCore(machine, config, 1, false)
        client.receive(Wire.Do(1, 2, "P:SPADES-ACE-0")) // not even bidding yet
        assertTrue(client.outOfSync)
    }

    private fun <S, A> GameMachine<S, A>.decodeOrFail(text: String): A = decode(text) ?: error("cannot decode $text")
}

class LobbyTest {
    @Test fun hostAndGuestsGetSeatsAndStartTheSameGame() {
        val toGuest = HashMap<String, ArrayList<String>>()
        lateinit var lobby: com.rangepatte.app.net.core.LobbyHost
        lobby = com.rangepatte.app.net.core.LobbyHost(
            GameId.COAT_PIECE, 4, "Host", AiDifficulty.HARD,
            sendToPeer = { peer, text -> toGuest.getOrPut(peer) { ArrayList() }.add(text) },
            broadcast = { text -> lobby.guests.keys.forEach { toGuest.getOrPut(it) { ArrayList() }.add(text) } }
        )
        val guestA = com.rangepatte.app.net.core.LobbyGuest("Anita") { lobby.onMessage("endpoint-A", it) }
        val guestB = com.rangepatte.app.net.core.LobbyGuest("Bimal") { lobby.onMessage("endpoint-B", it) }
        guestA.onConnected(); guestB.onConnected()
        assertEquals(listOf("Host", "Anita", "Bimal"), lobby.names())
        toGuest["endpoint-A"]!!.forEach { guestA.onMessage(it) }
        assertEquals(listOf("Host", "Anita", "Bimal"), guestA.names)

        // a fourth person joins, then a fifth is turned away (3 guests max for 4 seats)
        lobby.onMessage("endpoint-C", Wire.Join("Chitra").encode())
        assertTrue(lobby.isFull)
        lobby.onMessage("endpoint-D", Wire.Join("Dev").encode())
        assertEquals(Wire.Reject("full"), Wire.decode(toGuest["endpoint-D"]!!.single()))
        // someone leaves: the lobby updates
        assertTrue(lobby.onPeerLost("endpoint-C"))
        assertEquals(listOf("Host", "Anita", "Bimal"), lobby.names())

        val started = lobby.start(seed = 77)
        assertEquals(mapOf("endpoint-A" to 2, "endpoint-B" to 1), started.seatByPeer)
        assertEquals(setOf(0, 1, 2), started.config.humanSeats)
        assertEquals(listOf("Host", "Bimal", "Anita", com.rangepatte.app.net.core.BOT_NAMES[0]), started.config.seatNames)
        val startA = toGuest["endpoint-A"]!!.mapNotNull { Wire.decode(it) }.filterIsInstance<Wire.Start>().single()
        assertEquals(2, startA.yourSeat)
        assertEquals(started.config, startA.config)
        // late joiners are refused once started
        lobby.onMessage("endpoint-E", Wire.Join("Late").encode())
        assertEquals(Wire.Reject("started"), Wire.decode(toGuest["endpoint-E"]!!.single()))
    }

    @Test fun smallerTablesFillSeatsInOrder() {
        val lobby = com.rangepatte.app.net.core.LobbyHost(GameId.RUMMY, 6, "H", AiDifficulty.EASY, { _, _ -> }, { })
        lobby.onMessage("a", Wire.Join("A").encode()); lobby.onMessage("b", Wire.Join("B").encode())
        val started = lobby.start(1)
        assertEquals(mapOf("a" to 1, "b" to 2), started.seatByPeer)
        assertEquals(listOf("H", "A", "B"), started.config.seatNames.take(3))
        assertEquals(6, started.config.seats)
    }
}
