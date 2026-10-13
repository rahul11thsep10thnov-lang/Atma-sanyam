package com.rangepatte.app.game

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.snakes.Outcome
import com.rangepatte.app.domain.snakes.SnakesAction
import com.rangepatte.app.domain.snakes.SnakesBoard
import com.rangepatte.app.domain.snakes.SnakesEngine
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesRules
import com.rangepatte.app.game.snakes.SnakesMachine
import com.rangepatte.app.game.snakes.SnakesSfx
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SessionCore
import com.rangepatte.app.net.core.Wire
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Moksha Patam: the board, every house rule, the lockstep machine and the sounds. */
class SnakesEngineTest {
    private fun at(vararg squares: Int, rules: SnakesRules = SnakesRules.DEFAULT) =
        SnakesEngine.newGame(List(squares.size) { "P$it" }, rules).let { s -> s.copy(players = s.players.mapIndexed { i, p -> p.copy(square = squares[i]) }) }

    @Test fun theBoardNumbersBackAndForthAndTheJumpsAreConsistent() {
        assertEquals(0 to 0, SnakesBoard.cellOf(1)); assertEquals(9 to 0, SnakesBoard.cellOf(10))
        assertEquals(9 to 1, SnakesBoard.cellOf(11)); assertEquals(0 to 1, SnakesBoard.cellOf(20))
        assertEquals(0 to 9, SnakesBoard.cellOf(100)); assertEquals(9 to 9, SnakesBoard.cellOf(91))
        assertEquals(9, SnakesBoard.SNAKES.size); assertEquals(8, SnakesBoard.LADDERS.size)
        // The owner's layout rules: no serpent head in 1-10, exactly one ladder starting there, nothing straight up a column.
        assertTrue(SnakesBoard.SNAKES.keys.none { it in 1..10 })
        assertEquals(1, SnakesBoard.LADDERS.keys.count { it in 1..10 })
        (SnakesBoard.SNAKES + SnakesBoard.LADDERS).forEach { (a, b) -> assertTrue("$a-$b leans", SnakesBoard.cellOf(a).first != SnakesBoard.cellOf(b).first) }
        assertEquals(SnakesBoard.SNAKES.keys, SnakesBoard.BREEDS.keys)
        assertEquals(SnakesBoard.SNAKES.size, SnakesBoard.BREEDS.values.toSet().size)
        val squaresUsed = SnakesBoard.SNAKES.keys + SnakesBoard.SNAKES.values + SnakesBoard.LADDERS.keys + SnakesBoard.LADDERS.values
        assertEquals(34, squaresUsed.toSet().size)
        SnakesBoard.LADDERS.forEach { (foot, top) -> assertTrue(top > foot); assertNull(SnakesBoard.jump(top)) }
        SnakesBoard.SNAKES.forEach { (head, tail) -> assertTrue(tail < head); assertNull(SnakesBoard.jump(tail)) }
        assertTrue((SnakesBoard.LADDERS.keys + SnakesBoard.SNAKES.keys).none { it == 100 || it == 1 })
        assertEquals(listOf(5, 6, 7), SnakesBoard.path(4, 7)); assertEquals(listOf(6, 5), SnakesBoard.path(7, 5))
        assertEquals(listOf(LudoColor.RED, LudoColor.YELLOW), SnakesEngine.newGame(listOf("A", "B")).players.map { it.color })
    }

    @Test fun laddersClimbSerpentsSlideAndASixRollsAgain() {
        val s = at(0, 0)
        val up = SnakesEngine.roll(s, 3)!! // 3 is a ladder foot → 22
        assertEquals(22, up.players[0].square); assertTrue(up.last!!.climbed); assertEquals(1, up.statsOf(0).ladders)
        assertEquals(1, up.turn)
        val six = SnakesEngine.roll(s, 6)!!
        assertEquals(0, six.turn); assertTrue(six.last!!.extraRoll); assertEquals(1, six.statsOf(0).sixes)
        val down = SnakesEngine.roll(at(30, 0), 2)!! // 32 is a serpent's head → 10
        assertEquals(10, down.players[0].square); assertTrue(down.last!!.slid); assertEquals(1, down.statsOf(0).snakes)
        val noExtra = SnakesEngine.roll(at(0, 0, rules = SnakesRules(sixRollsAgain = false)), 6)!!
        assertEquals(1, noExtra.turn)
    }

    @Test fun theFinishNeedsAnExactRollUnlessTheRulesSayOtherwise() {
        val exact = SnakesEngine.roll(at(97, 0), 5)!!
        assertEquals(Outcome.STAYED, exact.last!!.outcome); assertEquals(97, exact.players[0].square); assertEquals(1, exact.turn)
        val bounce = SnakesEngine.roll(at(97, 0, rules = SnakesRules(bounceBack = true)), 5)!!
        assertEquals(Outcome.BOUNCED, bounce.last!!.outcome); assertEquals(98, bounce.last!!.landed)
        assertEquals(79, bounce.players[0].square) // 98 is a serpent's head → 79
        val loose = SnakesEngine.roll(at(97, 0, rules = SnakesRules(exactFinish = false)), 5)!!
        assertTrue(loose.last!!.finished); assertEquals(100, loose.players[0].square)
        val win = SnakesEngine.roll(at(97, 50), 3)!!
        assertTrue(win.last!!.finished); assertEquals(SnakesPhase.OVER, win.phase)
        assertEquals(listOf(0, 1), win.places)
        val threePlay = SnakesEngine.roll(at(97, 50, 30), 3)!!
        assertEquals(SnakesPhase.ROLL, threePlay.phase); assertEquals(1, threePlay.turn)
        val threeEnd = SnakesEngine.roll(at(97, 50, 30, rules = SnakesRules(playOnForPlaces = false)), 3)!!
        assertEquals(SnakesPhase.OVER, threeEnd.phase); assertEquals(listOf(0, 1, 2), threeEnd.places)
    }

    @Test fun sixToStartAndCapturesAreSwitches() {
        val held = SnakesEngine.roll(at(0, 0, rules = SnakesRules(sixToStart = true)), 3)!!
        assertEquals(Outcome.NO_ENTRY, held.last!!.outcome); assertEquals(0, held.players[0].square); assertEquals(1, held.turn)
        val entered = SnakesEngine.roll(at(0, 0, rules = SnakesRules(sixToStart = true)), 6)!!
        assertEquals(6, entered.players[0].square); assertEquals(0, entered.turn)
        val shared = SnakesEngine.roll(at(10, 13), 3)!!
        assertEquals(13, shared.players[1].square) // no captures by default
        val captured = SnakesEngine.roll(at(10, 13, rules = SnakesRules(captures = true)), 3)!!
        assertEquals(0, captured.players[1].square); assertEquals(listOf(1), captured.last!!.captured); assertEquals(1, captured.statsOf(0).captures)
    }

    @Test fun fourPhonesStayInStepThroughWholeMatches() {
        for (seed in 1L..5L) {
            val cfg = MatchConfig(GameId.SNAKES_LADDERS, List(4) { "P$it" }, setOf(0, 1, 2, 3), AiDifficulty.MEDIUM, seed, SnakesRules.DEFAULT.encode())
            val host = SessionCore(SnakesMachine, cfg, 0, isHost = true)
            val guests = (1..3).map { SessionCore(SnakesMachine, cfg, it, isHost = false) }
            var steps = 0
            while (host.state.phase != SnakesPhase.OVER && steps++ < 5_000) {
                val seat = SnakesMachine.seatToAct(host.state)!!
                val move = host.hostAccept(seat, SnakesMachine.decideForBot(host.state, seat, AiDifficulty.MEDIUM, Random(steps.toLong()))!!)!!
                guests.forEach { it.receive(move) }
                assertEquals(host.state, SnakesMachine.decodeState(SnakesMachine.encodeState(host.state)))
            }
            assertEquals(SnakesPhase.OVER, host.state.phase); assertEquals(4, host.state.places.size)
            guests.forEach { assertFalse(it.outOfSync); assertEquals(host.state, it.state) }
            assertNull(host.hostAccept(1, SnakesAction.Rematch))
            val again = host.hostAccept(0, SnakesAction.Rematch)!!
            guests.forEach { assertTrue(it.receive(again)) }
            assertEquals(SnakesPhase.ROLL, host.state.phase); assertTrue(host.state.players.all { it.square == 0 })
            assertEquals(Wire.decode(Wire.Start(cfg, 1).encode()), Wire.Start(cfg, 1))
        }
        assertEquals(SnakesRules(bounceBack = true), SnakesRules.decode(SnakesRules(bounceBack = true).encode()))
        assertEquals(SnakesRules.DEFAULT, SnakesRules.decode("bad"))
    }

    @Test fun soundsFollowTheTurn() {
        fun sounds(b: com.rangepatte.app.domain.snakes.SnakesState, a: com.rangepatte.app.domain.snakes.SnakesState, seat: Int?) = SnakesSfx.cues(b, a, seat).sortedBy { it.delayMs }.map { it.sfx }
        val s = at(0, 0)
        assertEquals(listOf(Sfx.DICE_LAND, Sfx.DICE_LAND, Sfx.DICE_LAND, Sfx.TOKEN_ENTERS, Sfx.TOKEN_STEP, Sfx.TOKEN_STEP, Sfx.LADDER_CLIMB, Sfx.YOUR_TURN), sounds(s, SnakesEngine.roll(s, 3)!!, 1))
        val d = at(30, 0)
        assertTrue(Sfx.SNAKE_HISS in sounds(d, SnakesEngine.roll(d, 2)!!, 0))
        val stay = at(97, 0)
        assertTrue(Sfx.INVALID_MOVE in sounds(stay, SnakesEngine.roll(stay, 5)!!, 0))
        val w = at(97, 50)
        assertEquals(listOf(Sfx.DICE_LAND, Sfx.DICE_LAND, Sfx.DICE_LAND, Sfx.TOKEN_MOVE, Sfx.TOKEN_STEP, Sfx.TOKEN_STEP, Sfx.FINISH_SQUARE, Sfx.SNAKES_VICTORY, Sfx.MATCH_COMPLETE), sounds(w, SnakesEngine.roll(w, 3)!!, 0))
        assertTrue(Sfx.SNAKES_DEFEAT in sounds(w, SnakesEngine.roll(w, 3)!!, 1))
    }
}
