package com.rangepatte.app.game

import com.rangepatte.app.domain.ludo.LudoAction
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.ludo.LudoMachine
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.net.core.LobbyHost
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

/** Ludo stage 6: the lockstep machine over the rules engine. */
class LudoMachineTest {
    private fun config(seats: Int, humans: Set<Int>, rules: LudoRules = LudoRules.DEFAULT, seed: Long = 11) =
        MatchConfig(GameId.LUDO, List(seats) { "P$it" }, humans, AiDifficulty.MEDIUM, seed, rules.encode())

    @Test fun houseRulesTravelAsFiveFlags() {
        val custom = LudoRules(sixToEnter = false, extraRollOnSix = true, extraRollOnCapture = false, exactFinish = true, playOnForPlaces = false)
        assertEquals("01010", custom.encode())
        assertEquals(custom, LudoRules.decode("01010"))
        assertEquals(LudoRules.DEFAULT, LudoRules.decode(""))
        assertEquals(LudoRules.DEFAULT, LudoRules.decode("garbage"))
        assertTrue(LudoRules.DEFAULT.isDefault)
        assertFalse(custom.isDefault)
    }

    @Test fun startSeatsPeopleAndComputersByTheConfig() {
        val state = LudoMachine.start(config(3, setOf(0, 2)), Random(1))
        assertEquals(listOf("P0", "P1", "P2"), state.players.map { it.name })
        assertEquals(listOf(false, true, false), state.players.map { it.isBot })
        assertEquals(listOf(LudoColor.RED, LudoColor.GREEN, LudoColor.YELLOW), state.players.map { it.color })
        val custom = LudoMachine.start(config(2, setOf(0), LudoRules(sixToEnter = false)), Random(1))
        assertFalse(custom.rules.sixToEnter)
    }

    @Test fun theHostOnlyAcceptsTheSeatWhoseTurnItIs() {
        val host = SessionCore(LudoMachine, config(4, setOf(0, 1, 2, 3)), 0, isHost = true)
        assertNull(host.hostAccept(1, LudoAction.Roll))
        assertNull(host.hostAccept(0, LudoAction.Move(0)))
        val roll = host.hostAccept(0, LudoAction.Roll)
        assertNotNull(roll)
        assertEquals("R", roll!!.action)
        assertEquals(1, host.seq)
    }

    @Test fun theDieComesFromTheSharedRandomSoEveryPhoneRollsTheSame() {
        val a = SessionCore(LudoMachine, config(2, setOf(0, 1), seed = 99), 0, isHost = true)
        val b = SessionCore(LudoMachine, config(2, setOf(0, 1), seed = 99), 1, isHost = false)
        val move = a.hostAccept(0, LudoAction.Roll)!!
        assertTrue(b.receive(move))
        assertEquals(a.state.dice ?: a.state.lastEvent, b.state.dice ?: b.state.lastEvent)
        assertEquals(a.state, b.state)
    }

    @Test fun fourPhonesStayInStepThroughWholeMatchesWithShuffledDelivery() {
        for (seed in 1L..6L) {
            val cfg = config(4, setOf(0, 1, 2, 3), seed = seed)
            val host = SessionCore(LudoMachine, cfg, 0, isHost = true)
            val guests = (1..3).map { SessionCore(LudoMachine, cfg, it, isHost = false) }
            val inFlight = ArrayList<Wire.Do>()
            val shuffle = Random(seed)
            var steps = 0
            while (host.state.phase != LudoPhase.OVER && steps < 4_000) {
                val seat = LudoMachine.seatToAct(host.state)!!
                val action = LudoMachine.decideForBot(host.state, seat, AiDifficulty.HARD, Random(seed * 31 + steps))!!
                inFlight += host.hostAccept(seat, action) ?: error("a computer move was refused at step $steps")
                steps++
                // Deliver in a scrambled order, with a duplicate now and then; the guests must sort it out.
                if (inFlight.size >= 3) {
                    inFlight.shuffle(shuffle)
                    if (shuffle.nextInt(4) == 0) inFlight += inFlight.first()
                    guests.forEach { g -> inFlight.forEach { g.receive(it) } }
                    inFlight.clear()
                }
            }
            guests.forEach { g -> inFlight.forEach { g.receive(it) } }
            assertEquals("seed $seed finished", LudoPhase.OVER, host.state.phase)
            assertEquals("seed $seed places", 4, host.state.places.size)
            guests.forEach { g ->
                assertFalse("seed $seed guest ${g.mySeat} in sync", g.outOfSync)
                assertEquals("seed $seed guest ${g.mySeat}", host.state, g.state)
            }
        }
    }

    @Test fun statesAndActionsRoundTripAsText() {
        val core = SessionCore(LudoMachine, config(4, setOf(0), seed = 5), 0, isHost = true)
        var checked = 0
        while (core.state.phase != LudoPhase.OVER && checked < 4_000) {
            val text = LudoMachine.encodeState(core.state)
            assertEquals(core.state, LudoMachine.decodeState(text))
            assertEquals(core.state, LudoMachine.redact(core.state, null))
            val seat = LudoMachine.seatToAct(core.state)!!
            val action = LudoMachine.decideForBot(core.state, seat, AiDifficulty.MEDIUM, Random(checked.toLong()))!!
            assertEquals(action, LudoMachine.decode(LudoMachine.encode(action)))
            core.hostAccept(seat, action)
            checked++
        }
        assertNull(LudoMachine.decode("M9"))
        assertNull(LudoMachine.decode("X"))
        assertNull(LudoMachine.decodeState("not|a|state"))
        assertEquals(LudoPhase.OVER, core.state.phase)
        assertTrue(LudoMachine.isRoundBoundary(core.state))
        assertEquals("Anita", LudoMachine.rename(core.state, 2, "Anita").players[2].name)
    }

    @Test fun theLobbyCarriesLudoHouseRulesToEveryGuest() {
        val sent = HashMap<String, ArrayList<String>>()
        val rules = LudoRules(exactFinish = false)
        val lobby = LobbyHost(GameId.LUDO, 4, "Host", AiDifficulty.EASY, { peer, text -> sent.getOrPut(peer) { ArrayList() }.add(text) }, { }, options = rules.encode())
        lobby.onMessage("a", Wire.Join("Anita").encode())
        val started = lobby.start(7)
        assertEquals(rules.encode(), started.config.options)
        assertEquals(mapOf("a" to 2), started.seatByPeer) // first guest sits opposite: the yellow yard
        val start = Wire.decode(sent.getValue("a").last()) as Wire.Start
        assertEquals(started.config, start.config)
        assertEquals(rules, LudoRules.decode(start.config.options))
        assertEquals(LudoColor.YELLOW, LudoMachine.start(start.config, Random(1)).players[2].color)
        assertEquals(listOf(2, 1, 3), LobbyHost.guestSeatOrder(4))
        assertEquals(listOf(1, 2), LobbyHost.guestSeatOrder(3))
        assertEquals(LudoMachine, GameMachines.forGame(GameId.LUDO))
    }

    @Test fun aStartMessageWithoutOptionsStillDecodes() {
        val old = "START|LUDO|MEDIUM|5|1|Host,Anita|0,1"
        val start = Wire.decode(old) as Wire.Start
        assertEquals("", start.config.options)
        assertEquals(LudoRules.DEFAULT, LudoRules.decode(start.config.options))
        val fresh = Wire.Start(config(2, setOf(0, 1), LudoRules(sixToEnter = false)), 1)
        assertEquals(fresh, Wire.decode(fresh.encode()))
    }

    @Test fun theHostsColourTravelsWithTheRulesAndSeatsFollowClockwise() {
        val opts = LudoRules.options(LudoRules(exactFinish = false), LudoColor.BLUE)
        assertEquals("11101B", opts)
        assertEquals(LudoRules(exactFinish = false), LudoRules.decode(opts))
        assertEquals(LudoColor.BLUE, LudoRules.colorOf(opts))
        assertEquals(LudoColor.RED, LudoRules.colorOf("10111"))
        assertEquals(listOf(LudoColor.BLUE, LudoColor.RED, LudoColor.GREEN, LudoColor.YELLOW), com.rangepatte.app.domain.ludo.LudoEngine.colorsFor(4, LudoColor.BLUE))
        assertEquals(listOf(LudoColor.GREEN, LudoColor.BLUE), com.rangepatte.app.domain.ludo.LudoEngine.colorsFor(2, LudoColor.GREEN))
        val cfg = MatchConfig(GameId.LUDO, listOf("H", "G"), setOf(0, 1), AiDifficulty.EASY, 1, opts)
        assertEquals(listOf(LudoColor.BLUE, LudoColor.GREEN), LudoMachine.start(cfg, Random(1)).players.map { it.color })
    }
}
