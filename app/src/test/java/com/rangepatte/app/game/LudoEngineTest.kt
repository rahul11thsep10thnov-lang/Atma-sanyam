package com.rangepatte.app.game

import com.rangepatte.app.domain.ludo.Cell
import com.rangepatte.app.domain.ludo.LudoBoard
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoPlayer
import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.domain.model.AiDifficulty
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class LudoEngineTest {
    private fun four() = LudoEngine.newGame(listOf("A", "B", "C", "D"))
    private fun with(state: LudoState, player: Int, tokens: List<Int>) =
        state.copy(players = state.players.mapIndexed { i, p -> if (i == player) p.copy(tokens = tokens) else p })

    @Test fun boardGeometryIsTheStandardOne() {
        assertEquals(52, LudoBoard.TRACK.size)
        assertEquals(52, LudoBoard.TRACK.toSet().size)
        assertEquals(Cell(1, 6), LudoBoard.TRACK[LudoColor.RED.startIndex])
        assertEquals(Cell(8, 1), LudoBoard.TRACK[LudoColor.GREEN.startIndex])
        assertEquals(Cell(13, 8), LudoBoard.TRACK[LudoColor.YELLOW.startIndex])
        assertEquals(Cell(6, 13), LudoBoard.TRACK[LudoColor.BLUE.startIndex])
        assertEquals(8, LudoBoard.SAFE_INDICES.size)
        assertTrue(LudoBoard.isSafe(8) && LudoBoard.isSafe(21))
        // Consecutive track cells touch (the four inner corners are diagonal steps, as on the real board).
        LudoBoard.TRACK.zipWithNext().forEach { (a, b) -> assertEquals(1, maxOf(Math.abs(a.col - b.col), Math.abs(a.row - b.row))) }
        LudoColor.values().forEach { c ->
            assertEquals(5, LudoBoard.homeColumn(c).size)
            assertEquals(LudoBoard.CENTRE, LudoBoard.cellOf(c, LudoBoard.HOME))
            // The last track cell before the column is next to the column's first cell.
            val last = LudoBoard.cellOf(c, LudoBoard.LAST_TRACK)!!; val first = LudoBoard.homeColumn(c)[0]
            assertEquals(1, Math.abs(last.col - first.col) + Math.abs(last.row - first.row))
        }
    }

    @Test fun sixIsNeededToEnterAndGivesAnotherRoll() {
        val s = four()
        val r3 = LudoEngine.roll(s, 3)!!
        assertEquals(1, r3.turn) // nothing could move: turn passes
        val r6 = LudoEngine.roll(s, 6)!!
        assertEquals(LudoPhase.MOVE, r6.phase)
        assertEquals(listOf(0, 1, 2, 3), r6.movable)
        val moved = LudoEngine.move(r6, 0)!!
        assertEquals(0, moved.players[0].tokens[0])
        assertEquals(0, moved.turn) // extra roll on a six
        assertEquals(LudoPhase.ROLL, moved.phase)
        // Without "six to enter", a 3 enters a token too.
        val loose = s.copy(rules = LudoRules(sixToEnter = false))
        assertEquals(LudoPhase.MOVE, LudoEngine.roll(loose, 3)!!.phase)
    }

    @Test fun threeSixesForfeitTheTurn() {
        var s = with(four(), 0, listOf(5, LudoBoard.YARD, LudoBoard.YARD, LudoBoard.YARD))
        s = LudoEngine.move(LudoEngine.roll(s, 6)!!, 0)!!
        s = LudoEngine.move(LudoEngine.roll(s, 6)!!, 0)!!
        assertEquals(2, s.sixStreak)
        val third = LudoEngine.roll(s, 6)!!
        assertTrue(third.lastEvent is LudoEvent.Forfeit)
        assertEquals(1, third.turn)
    }

    @Test fun captureSendsHomeAndGivesAnotherRollButNotOnSafeSquares() {
        // Blue token sits on the square red reaches with a 4 (red relative 4 → absolute 4).
        val blueRel = (4 - LudoColor.BLUE.startIndex + 52) % 52
        var s = with(four(), 0, listOf(0, LudoBoard.YARD, LudoBoard.YARD, LudoBoard.YARD))
        s = with(s, 3, listOf(blueRel, LudoBoard.YARD, LudoBoard.YARD, LudoBoard.YARD))
        val after = LudoEngine.move(LudoEngine.roll(s, 4)!!, 0)!!
        assertEquals(LudoBoard.YARD, after.players[3].tokens[0])
        assertEquals(0, after.turn) // extra roll on capture
        val ev = after.lastEvent as LudoEvent.Moved
        assertEquals(listOf(3 to 0), ev.captured)
        // On the safe star (absolute 8) nothing is captured.
        val safeRel = (8 - LudoColor.BLUE.startIndex + 52) % 52
        var t = with(four(), 0, listOf(4, LudoBoard.YARD, LudoBoard.YARD, LudoBoard.YARD))
        t = with(t, 3, listOf(safeRel, LudoBoard.YARD, LudoBoard.YARD, LudoBoard.YARD))
        val safe = LudoEngine.move(LudoEngine.roll(t, 4)!!, 0)!!
        assertEquals(safeRel, safe.players[3].tokens[0])
        assertEquals(1, safe.turn)
    }

    @Test fun homeNeedsAnExactRollAndFinishingAllFourWins() {
        var s = with(four(), 0, listOf(54, 56, 56, 56))
        assertNull(LudoEngine.roll(s, 3)!!.dice.takeIf { LudoEngine.roll(s, 3)!!.phase == LudoPhase.MOVE }) // 54 + 3 = 57: no move
        assertEquals(1, LudoEngine.roll(s, 3)!!.turn)
        val won = LudoEngine.move(LudoEngine.roll(s, 2)!!, 0)!!
        assertEquals(LudoBoard.HOME, won.players[0].tokens[0])
        assertEquals(listOf(0), won.places)
        assertTrue(won.lastEvent is LudoEvent.Won)
        assertEquals(LudoPhase.ROLL, won.phase) // play on for places
        assertEquals(1, won.turn)
        // With "play on" off the match ends at once.
        val ends = LudoEngine.move(LudoEngine.roll(s.copy(rules = LudoRules(playOnForPlaces = false)), 2)!!, 0)!!
        assertEquals(LudoPhase.OVER, ends.phase)
        assertEquals(4, ends.places.size)
    }

    @Test fun twoAndThreePlayerSeating() {
        assertEquals(listOf(LudoColor.RED, LudoColor.YELLOW), LudoEngine.newGame(listOf("A", "B")).players.map { it.color })
        assertEquals(listOf(LudoColor.RED, LudoColor.GREEN, LudoColor.YELLOW), LudoEngine.newGame(listOf("A", "B", "C")).players.map { it.color })
    }

    @Test fun aFullBotGameAlwaysEnds() {
        for (seed in 1..20) {
            val random = Random(seed)
            var s = LudoEngine.newGame(listOf("A", "B", "C", "D"))
            var guard = 0
            while (s.phase != LudoPhase.OVER && guard++ < 20_000) {
                s = when (s.phase) {
                    LudoPhase.ROLL -> LudoEngine.roll(s, random.nextInt(1, 7))!!
                    LudoPhase.MOVE -> LudoEngine.move(s, LudoEngine.chooseToken(s, AiDifficulty.HARD, random)!!)!!
                    LudoPhase.OVER -> s
                }
                // Invariant: no two different colours share an unsafe track square.
                val occupied = HashMap<Int, LudoColor>()
                s.players.forEach { p -> p.tokens.filter { it in 0..LudoBoard.LAST_TRACK }.forEach { t ->
                    val abs = LudoBoard.trackIndex(p.color, t)
                    val other = occupied.put(abs, p.color)
                    if (other != null && other != p.color) assertTrue("seed $seed: two colours on unsafe square $abs", LudoBoard.isSafe(abs))
                } }
            }
            assertEquals("seed $seed", LudoPhase.OVER, s.phase)
            assertEquals(4, s.places.toSet().size)
        }
    }

    @Test fun illegalActionsAreRefused() {
        val s = four()
        assertNull(LudoEngine.move(s, 0)) // must roll first
        assertNull(LudoEngine.roll(s, 7))
        val r = LudoEngine.roll(s, 6)!!
        assertNull(LudoEngine.roll(r, 6)) // must move first
        assertNotNull(LudoEngine.move(r, 2))
        assertFalse(LudoPlayer(LudoColor.RED, "x").isHome)
    }
}
