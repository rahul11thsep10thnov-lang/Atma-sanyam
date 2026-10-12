package com.rangepatte.app.game.snakes

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.domain.snakes.Outcome
import com.rangepatte.app.domain.snakes.SnakesBoard
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesState

/**
 * Which sounds one Moksha Patam step deserves (stage 9), timed to the animations: the die spins
 * [DIE_SPIN_MS], the token glides [STEP_MS] a square, a ladder or serpent takes [JUMP_MS]. Pure.
 */
object SnakesSfx {
    const val DIE_SPIN_MS = 600L
    const val STEP_MS = 110L
    const val JUMP_MS = 700L

    fun start(): List<SfxCue> = listOf(SfxCue(Sfx.GAME_START))

    fun cues(before: SnakesState, after: SnakesState, mySeat: Int?): List<SfxCue> {
        val out = ArrayList<SfxCue>()
        var end = 0L
        val t = after.last
        if (t != null && after.moveCount != before.moveCount) {
            out += SfxCue(Sfx.DICE_ROLL)
            out += SfxCue(Sfx.DICE_LAND, DIE_SPIN_MS)
            end = DIE_SPIN_MS + 150
            when (t.outcome) {
                Outcome.NO_ENTRY, Outcome.STAYED -> { out += SfxCue(Sfx.INVALID_MOVE, end); end += 350 }
                Outcome.MOVED, Outcome.BOUNCED -> {
                    val squares = kotlin.math.abs(t.landed - t.from)
                    out += SfxCue(if (t.from == SnakesBoard.START) Sfx.TOKEN_ENTERS else Sfx.TOKEN_MOVE, end)
                    for (i in 1 until squares.coerceAtMost(6)) out += SfxCue(Sfx.TOKEN_STEP, end + STEP_MS * i)
                    end += STEP_MS * squares + 100
                    if (t.climbed) { out += SfxCue(Sfx.LADDER_CLIMB, end); end += JUMP_MS }
                    if (t.slid) { out += SfxCue(Sfx.SNAKE_HISS, end); out += SfxCue(Sfx.SNAKE_SLIDE, end + 200); end += JUMP_MS + 200 }
                    if (t.captured.isNotEmpty()) { out += SfxCue(Sfx.TOKEN_CAPTURE, end); end += 350 }
                    if (t.to >= SnakesBoard.LAST - 6 && !t.finished) { out += SfxCue(Sfx.NEAR_FINISH, end); end += 300 }
                    if (t.finished) {
                        out += SfxCue(Sfx.FINISH_SQUARE, end)
                        out += SfxCue(if (t.player == mySeat) Sfx.SNAKES_VICTORY else Sfx.TOKEN_HOME, end + 300)
                        end += if (t.player == mySeat) 1_900 else 800
                    }
                }
            }
            if (t.value == 6 && t.extraRoll) { out += SfxCue(Sfx.BONUS_ROLL, end); end += 250 }
        }
        if (after.phase == SnakesPhase.OVER && before.phase != SnakesPhase.OVER) {
            out += SfxCue(Sfx.MATCH_COMPLETE, end)
            if (mySeat != null && after.places.firstOrNull() != mySeat) out += SfxCue(Sfx.SNAKES_DEFEAT, end + 700)
        } else if (mySeat != null && after.turn == mySeat && after.phase == SnakesPhase.ROLL && (before.turn != mySeat || before.phase != SnakesPhase.ROLL)) {
            out += SfxCue(Sfx.YOUR_TURN, end + 100)
        }
        return out
    }
}
