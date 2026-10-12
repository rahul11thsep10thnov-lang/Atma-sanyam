package com.rangepatte.app.game.ludo

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.domain.ludo.LudoBoard
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoState

/**
 * Which sounds one Ludo step deserves (stage 9), timed to the stage 4 animations: the die spins for
 * [DIE_SPIN_MS] before it lands, a token glides [STEP_MS] a square and at least [MIN_GLIDE_MS]. Pure:
 * it only names the effects, once per engine event, for the phone sitting at [mySeat] (null: a watcher).
 */
object LudoSfx {
    const val DIE_SPIN_MS = 600L
    const val STEP_MS = 90L
    const val MIN_GLIDE_MS = 350L
    /** Up to this many squares the glide gets a tick per square. */
    const val STEP_TICKS_MAX = 6

    fun start(): List<SfxCue> = listOf(SfxCue(Sfx.GAME_START))

    fun cues(before: LudoState, after: LudoState, mySeat: Int?): List<SfxCue> {
        val out = ArrayList<SfxCue>()
        var end = 0L
        when (val e = after.lastEvent) {
            is LudoEvent.Rolled -> {
                out += SfxCue(Sfx.DICE_ROLL)
                out += SfxCue(Sfx.DICE_LAND, DIE_SPIN_MS)
                end = DIE_SPIN_MS + 150
                if (e.value == 6 && !e.noMove && after.rules.extraRollOnSix) { out += SfxCue(Sfx.BONUS_ROLL, end); end += 250 }
            }
            is LudoEvent.Forfeit -> {
                out += SfxCue(Sfx.DICE_ROLL)
                out += SfxCue(Sfx.DICE_LAND, DIE_SPIN_MS)
                out += SfxCue(Sfx.INVALID_MOVE, DIE_SPIN_MS + 200)
                end = DIE_SPIN_MS + 550
            }
            is LudoEvent.Moved -> end = moveCues(e, out)
            is LudoEvent.Won -> {
                // The winning move itself: the last token reaching the centre, then the fanfare or the finish bell.
                out += SfxCue(Sfx.TOKEN_HOME)
                out += SfxCue(if (e.player == mySeat) Sfx.LUDO_VICTORY else Sfx.FINISH_SQUARE, 500)
                end = 500L + (if (e.player == mySeat) 1_600L else 500L)
            }
            null -> Unit
        }
        if (after.phase == LudoPhase.OVER && before.phase != LudoPhase.OVER) {
            out += SfxCue(Sfx.MATCH_COMPLETE, end)
            if (mySeat != null && after.places.firstOrNull() != mySeat) out += SfxCue(Sfx.LUDO_DEFEAT, end + 700)
        } else if (mySeat != null && after.turn == mySeat && after.phase == LudoPhase.ROLL && before.turn != mySeat) {
            out += SfxCue(Sfx.YOUR_TURN, end + 100)
        }
        return out
    }

    /** Enter or set off, a tick a square for a short glide, then what happened where it landed. Returns when the glide ends. */
    private fun moveCues(e: LudoEvent.Moved, out: MutableList<SfxCue>): Long {
        val squares = if (e.from == LudoBoard.YARD) 1 else e.to - e.from
        out += SfxCue(if (e.from == LudoBoard.YARD) Sfx.TOKEN_ENTERS else Sfx.TOKEN_MOVE)
        if (e.from != LudoBoard.YARD && squares in 2..STEP_TICKS_MAX) {
            for (i in 1 until squares) out += SfxCue(Sfx.TOKEN_STEP, STEP_MS * i)
        }
        val glide = maxOf(MIN_GLIDE_MS, STEP_MS * squares)
        var end = glide
        if (e.captured.isNotEmpty()) { out += SfxCue(Sfx.TOKEN_CAPTURE, glide + 100); end = glide + 450 }
        if (e.from in 0..LudoBoard.LAST_TRACK && e.to > LudoBoard.LAST_TRACK && !e.finished) { out += SfxCue(Sfx.NEAR_FINISH, glide); end = maxOf(end, glide + 300) }
        if (e.finished) { out += SfxCue(Sfx.TOKEN_HOME, glide); end = maxOf(end, glide + 500) }
        return end
    }
}
