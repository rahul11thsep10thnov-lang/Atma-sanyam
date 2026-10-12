package com.rangepatte.app.game

import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.ludo.LudoMachine
import com.rangepatte.app.net.core.LobbyGuest
import com.rangepatte.app.net.core.LobbyHost
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SeatKeeper
import com.rangepatte.app.net.core.SessionCore
import com.rangepatte.app.net.core.Wire
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Stage 8: kept seats, rejoining, and watching a full table. */
class ReconnectTest {
    @Test fun aDroppedSeatIsKeptForTheWindowAndMatchedByPeerOrName() {
        val keeper = SeatKeeper(windowMs = 60_000)
        keeper.drop(2, "Priya", "uid-priya", now = 1_000)
        assertEquals(2, keeper.match("uid-priya", "someone else", now = 30_000))
        assertEquals(2, keeper.match("endpoint-new", "priya", now = 30_000)) // Nearby: new endpoint, same name
        assertNull(keeper.match("endpoint-new", "amit", now = 30_000))
        assertNull(keeper.match("uid-priya", "Priya", now = 61_000)) // too late
        assertEquals(59_000L, keeper.remainingMs(2, now = 2_000))
        assertEquals(emptyList<Int>(), keeper.expire(now = 60_999))
        assertEquals(listOf(2), keeper.expire(now = 61_000))
        assertTrue(keeper.seats.isEmpty())
        keeper.drop(1, "Amit", "a", now = 0)
        assertEquals(SeatKeeper.Away(1, "Amit", "a", 60_000), keeper.reclaim(1))
        assertNull(keeper.reclaim(1))
    }

    @Test fun aSeatedGuestCanBeBroughtBackInStepButNotMovedToAnotherSeat() {
        val cfg = MatchConfig(GameId.LUDO, List(4) { "P$it" }, setOf(0, 1, 2, 3), AiDifficulty.MEDIUM, 3, LudoRules.DEFAULT.encode())
        val host = SessionCore(LudoMachine, cfg, 0, isHost = true)
        val guest = SessionCore(LudoMachine, cfg, 2, isHost = false)
        repeat(30) { step ->
            val seat = LudoMachine.seatToAct(host.state)!!
            host.hostAccept(seat, LudoMachine.decideForBot(host.state, seat, AiDifficulty.MEDIUM, Random(step.toLong()))!!)
        }
        // The guest missed everything; the host's seat message brings it back to the same position.
        assertFalse(guest.takeSeat(host.seatMessage(1)))
        assertTrue(guest.takeSeat(host.seatMessage(2)))
        assertEquals(host.state, guest.state)
        assertEquals(host.seq, guest.seq)
        assertFalse(host.takeSeat(host.seatMessage(0)))
        // From here the lockstep continues normally.
        val seat = LudoMachine.seatToAct(host.state)!!
        val next = host.hostAccept(seat, LudoMachine.decideForBot(host.state, seat, AiDifficulty.MEDIUM, Random(99))!!)!!
        assertTrue(guest.receive(next))
        assertEquals(host.state, guest.state)
    }

    @Test fun joinAndAwayMessagesRoundTrip() {
        assertEquals(Wire.Join("Priya"), Wire.decode(Wire.Join("Priya").encode()))
        assertEquals(Wire.Join("Priya", watch = true), Wire.decode(Wire.Join("Priya", watch = true).encode()))
        assertEquals(Wire.Join("Old phone"), Wire.decode("JOIN|Old+phone")) // before the watch flag
        assertEquals(Wire.Away(3, 60_000), Wire.decode(Wire.Away(3, 60_000).encode()))
        assertEquals(Wire.Away(3, 0), Wire.decode("AWAY|3|0"))
    }

    @Test fun aFullLobbyLetsALateArrivalWatchOnceTheGameStarts() {
        val sent = HashMap<String, ArrayList<String>>()
        val lobby = LobbyHost(GameId.LUDO, 2, "Host", AiDifficulty.EASY, { peer, text -> sent.getOrPut(peer) { ArrayList() }.add(text) }, { })
        lobby.onMessage("a", Wire.Join("Anita").encode())
        assertTrue(lobby.isFull)
        val late = LobbyGuest("Bimal") { lobby.onMessage("b", it) }
        late.onConnected()
        sent.getValue("b").forEach { late.onMessage(it) }
        assertEquals("full", late.rejectedReason)
        late.watch()
        assertTrue(late.watching)
        assertNull(late.rejectedReason)
        assertEquals(mapOf("b" to "Bimal"), lobby.watchers)
        sent.getValue("b").drop(1).forEach { late.onMessage(it) }
        assertEquals(listOf("Host", "Anita"), late.names)
        val started = lobby.start(1)
        assertEquals(mapOf("b" to "Bimal"), started.watchers)
        assertEquals(mapOf("a" to 1), started.seatByPeer)
        // Someone who leaves the full lobby before the start is forgotten.
        lobby.onPeerLost("b")
    }
}
