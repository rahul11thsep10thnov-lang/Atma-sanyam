package com.rangepatte.app.game

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.domain.ludo.LudoBoard
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.game.ludo.LudoSfx
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Ludo stage 9: one sound per engine event, timed to the animations, different for the listener. */
class LudoSfxTest {
    private fun sounds(cues: List<com.rangepatte.app.audio.SfxCue>) = cues.sortedBy { it.delayMs }.map { it.sfx }

    @Test fun aRollSpinsThenLandsAndASixAddsTheBonus() {
        val fresh = LudoEngine.newGame(listOf("A", "B"))
        val six = LudoEngine.roll(fresh, 6)!!
        assertEquals(listOf(Sfx.DICE_ROLL, Sfx.DICE_LAND, Sfx.BONUS_ROLL), sounds(LudoSfx.cues(fresh, six, 0)))
        val three = LudoEngine.roll(fresh, 3)!! // nothing can move: the turn passes to B
        assertEquals(listOf(Sfx.DICE_ROLL, Sfx.DICE_LAND, Sfx.YOUR_TURN), sounds(LudoSfx.cues(fresh, three, 1)))
        assertEquals(listOf(Sfx.DICE_ROLL, Sfx.DICE_LAND), sounds(LudoSfx.cues(fresh, three, 0)))
        assertEquals(listOf(Sfx.DICE_ROLL, Sfx.DICE_LAND), sounds(LudoSfx.cues(fresh, three, null)))
        assertEquals(LudoSfx.DIE_SPIN_MS, LudoSfx.cues(fresh, six, 0).first { it.sfx == Sfx.DICE_LAND }.delayMs)
    }

    @Test fun movesEnterStepCaptureAndComeHome() {
        val fresh = LudoEngine.newGame(listOf("A", "B"))
        val entered = LudoEngine.move(LudoEngine.roll(fresh, 6)!!, 0)!!
        assertEquals(listOf(Sfx.TOKEN_ENTERS), sounds(LudoSfx.cues(fresh, entered, 0)))
        // A four-square glide ticks three times.
        val onTrack = entered.copy(players = entered.players.mapIndexed { i, p -> if (i == 0) p.copy(tokens = listOf(10, -1, -1, -1)) else p }, turn = 0, phase = LudoPhase.ROLL, sixStreak = 0)
        val moved = LudoEngine.move(LudoEngine.roll(onTrack, 4)!!, 0)!!
        assertEquals(listOf(Sfx.TOKEN_MOVE, Sfx.TOKEN_STEP, Sfx.TOKEN_STEP, Sfx.TOKEN_STEP), sounds(LudoSfx.cues(onTrack, moved, 1)).filter { it != Sfx.YOUR_TURN })
        // A capture: B's token sits on A's target square (relative 14 for A is absolute 14; for B that is relative 14 - 26 + 52 = 40).
        val capture = onTrack.copy(players = onTrack.players.mapIndexed { i, p -> if (i == 1) p.copy(tokens = listOf(40, -1, -1, -1)) else p })
        val captured = LudoEngine.move(LudoEngine.roll(capture, 4)!!, 0)!!
        assertTrue((captured.lastEvent as LudoEvent.Moved).captured.isNotEmpty())
        assertTrue(Sfx.TOKEN_CAPTURE in sounds(LudoSfx.cues(capture, captured, 0)))
        // Into the home column, then home.
        val nearHome = onTrack.copy(players = onTrack.players.mapIndexed { i, p -> if (i == 0) p.copy(tokens = listOf(LudoBoard.LAST_TRACK, LudoBoard.HOME, LudoBoard.HOME, LudoBoard.HOME)) else p })
        val turned = LudoEngine.move(LudoEngine.roll(nearHome, 2)!!, 0)!!
        assertTrue(Sfx.NEAR_FINISH in sounds(LudoSfx.cues(nearHome, turned, 0)))
        val won = LudoEngine.move(LudoEngine.roll(nearHome, 6)!!, 0)!!
        assertEquals(LudoPhase.OVER, won.phase)
        val mine = sounds(LudoSfx.cues(nearHome, won, 0))
        assertEquals(listOf(Sfx.TOKEN_HOME, Sfx.LUDO_VICTORY, Sfx.MATCH_COMPLETE), mine)
        val theirs = sounds(LudoSfx.cues(nearHome, won, 1))
        assertEquals(listOf(Sfx.TOKEN_HOME, Sfx.FINISH_SQUARE, Sfx.MATCH_COMPLETE, Sfx.LUDO_DEFEAT), theirs)
        assertFalse(Sfx.LUDO_DEFEAT in sounds(LudoSfx.cues(nearHome, won, null)))
    }

    @Test fun threeSixesForfeitSoundsLikeARefusal() {
        val fresh = LudoEngine.newGame(listOf("A", "B"), LudoRules.DEFAULT).copy(sixStreak = 2)
        val forfeit = LudoEngine.roll(fresh, 6)!!
        assertTrue(forfeit.lastEvent is LudoEvent.Forfeit)
        assertEquals(listOf(Sfx.DICE_ROLL, Sfx.DICE_LAND, Sfx.INVALID_MOVE, Sfx.YOUR_TURN), sounds(LudoSfx.cues(fresh, forfeit, 1)))
    }
}
