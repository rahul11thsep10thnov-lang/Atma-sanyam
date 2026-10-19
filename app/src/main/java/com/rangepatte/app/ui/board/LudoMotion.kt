package com.rangepatte.app.ui.board

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import com.rangepatte.app.audio.DieTiming
import com.rangepatte.app.domain.ludo.Cell
import com.rangepatte.app.game.ludo.LudoSfx
import com.rangepatte.app.domain.ludo.LudoBoard
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoState
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/**
 * One frame of motion for the board renderer (stage 4, Design 3 "Glide"). Positions are in board
 * cells (fractional); the renderer draws the moving token here instead of at its resting square,
 * the captured tokens on their way home instead of in the yard, and a shine on a safe square.
 */
data class MotionFrame(
    /** The token on the move: its owner, index, and where to draw it (fractional cell), with lift 0..1. */
    val mover: Mover? = null,
    /** Captured tokens flying home: owner, index, fractional cell, scale 0..1. */
    val flying: List<Flyer> = emptyList(),
    /** A safe square that was just landed on, with its fading alpha. */
    val shine: Pair<Cell, Float>? = null
) {
    data class Mover(val player: Int, val token: Int, val at: Offset, val lift: Float, val trail: List<Offset>)
    data class Flyer(val player: Int, val token: Int, val at: Offset, val scale: Float)
    val busy: Boolean get() = mover != null || flying.isNotEmpty()
}

/**
 * The die as the screen draws it: the face it will show, whether a throw is running and how far into
 * its [DieTiming] timeline it is ([elapsedMs]), a [seed] that varies the tumble, and a six's flash.
 */
data class DieFrame(val face: Int?, val rotation: Float, val rolling: Boolean, val sixFlash: Float, val elapsedMs: Float = DieTiming.TOTAL_MS.toFloat(), val seed: Int = 0)

/**
 * Runs the animations the engine's events call for and exposes the current [frame] and [die].
 * [reduceMotion] snaps everything (the die shows its face, tokens jump, captures fade).
 */
class LudoMotion(private val reduceMotion: Boolean) {
    var frame: MotionFrame by mutableStateOf(MotionFrame())
        private set
    var die: DieFrame by mutableStateOf(DieFrame(null, 0f, false, 0f))
        private set

    /** True while something moves; the screen ignores taps and the bots wait. */
    val busy: Boolean get() = frame.busy || die.rolling

    private val spin = Animatable(0f)
    private val progress = Animatable(0f)
    private val flash = Animatable(0f)
    private val shineAlpha = Animatable(0f)

    /**
     * The 3D die is tossed, tumbles, bounces twice and settles showing [value] — which the engine
     * decided before the throw; the animation only lands on it ([DiePose]).
     */
    suspend fun roll(value: Int) {
        if (reduceMotion) { die = DieFrame(value, 0f, false, 0f); if (value == 6) flashSix(); return }
        val seed = Random.nextInt(0, 1_000)
        die = DieFrame(value, 0f, true, 0f, 0f, seed)
        spin.snapTo(0f)
        spin.animateTo(DieTiming.TOTAL_MS.toFloat(), tween(DieTiming.TOTAL_MS.toInt(), easing = LinearEasing)) {
            die = DieFrame(value, 0f, true, 0f, this.value, seed)
        }
        die = DieFrame(value, 0f, false, 0f)
        if (value == 6) flashSix()
    }

    private suspend fun flashSix() {
        flash.snapTo(1f)
        flash.animateTo(0f, tween(DieTiming.SIX_FLASH_MS.toInt())) { die = die.copy(sixFlash = this.value) }
    }

    /**
     * Glides the moved token along its path with an arc and a trail (90 ms a square, at least 350 ms),
     * then flies any captured tokens home and shines a safe square. [before] is the state the move was
     * made from (for the captured tokens' squares).
     */
    suspend fun move(before: LudoState, event: LudoEvent.Moved) {
        val player = before.players[event.player]
        val color = player.color
        val path: List<Offset> = buildList {
            if (event.from == LudoBoard.YARD) {
                val nest = LudoBoard.nestPoint(color, event.token)
                add(Offset(nest.x, nest.y)); add(LudoBoard.cellOf(color, event.to)!!.toOffset())
            } else {
                for (p in event.from..event.to) add(LudoBoard.cellOf(color, p)!!.toOffset())
            }
        }
        // Where the captured tokens were standing before they went home.
        val capturedFrom = event.captured.map { (pi, ti) ->
            val p = before.players[pi]
            Triple(pi, ti, LudoBoard.cellOf(p.color, p.tokens[ti])!!)
        }
        val landing = LudoBoard.cellOf(color, event.to)!!
        val landedSafe = event.to <= LudoBoard.LAST_TRACK && LudoBoard.isSafe(LudoBoard.trackIndex(color, event.to))

        if (reduceMotion) {
            if (capturedFrom.isNotEmpty()) {
                frame = MotionFrame(flying = capturedFrom.map { (pi, ti, c) -> MotionFrame.Flyer(pi, ti, c.toOffset(), 1f) })
                progress.snapTo(0f)
                progress.animateTo(1f, tween(300)) { frame = frame.copy(flying = frame.flying.map { it.copy(scale = 1f - this.value) }) }
            }
            frame = MotionFrame()
            return
        }

        val duration = maxOf(LudoSfx.MIN_GLIDE_MS.toInt(), LudoSfx.STEP_MS.toInt() * (path.size - 1))
        progress.snapTo(0f)
        progress.animateTo(1f, tween(duration, easing = LinearEasing)) {
            val t = this.value * (path.size - 1)
            val i = t.toInt().coerceAtMost(path.size - 2)
            val f = t - i
            val a = path[i]; val b = path[i + 1]
            val at = Offset(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f)
            val lift = sin(this.value * PI).toFloat() * 0.6f
            val trail = (1..4).mapNotNull { k ->
                val tt = (t - k * 0.6f); if (tt < 0) null else {
                    val j = tt.toInt().coerceAtMost(path.size - 2); val g = tt - j
                    val pa = path[j]; val pb = path[j + 1]
                    Offset(pa.x + (pb.x - pa.x) * g, pa.y + (pb.y - pa.y) * g)
                }
            }
            frame = MotionFrame(mover = MotionFrame.Mover(event.player, event.token, at, lift, trail))
        }
        if (capturedFrom.isNotEmpty()) {
            progress.snapTo(0f)
            progress.animateTo(1f, tween(800, easing = FastOutSlowInEasing)) {
                val v = this.value
                frame = MotionFrame(flying = capturedFrom.map { (pi, ti, c) ->
                    val np = LudoBoard.nestPoint(before.players[pi].color, ti); val nest = Offset(np.x, np.y)
                    val from = c.toOffset()
                    val arc = sin(v * PI).toFloat() * 1.5f
                    MotionFrame.Flyer(pi, ti, Offset(from.x + (nest.x - from.x) * v, from.y + (nest.y - from.y) * v - arc), 1.25f - 0.75f * v)
                })
            }
        }
        if (landedSafe) {
            shineAlpha.snapTo(1f)
            shineAlpha.animateTo(0f, tween(600)) { frame = MotionFrame(shine = landing to this.value) }
        }
        frame = MotionFrame()
    }
}

private fun Cell.toOffset() = Offset(col.toFloat(), row.toFloat())

/**
 * Watches the session's events and drives [LudoMotion]; the die and the board read its frames.
 * The session is told when motion is busy so the computer waits and taps are ignored.
 */
@Composable
fun rememberLudoMotion(state: LudoState, shownDice: Int?, reduceMotion: Boolean, onBusy: (Boolean) -> Unit): LudoMotion {
    val motion = remember { LudoMotion(reduceMotion) }
    var previous by remember { mutableStateOf(state) }
    LaunchedEffect(state.moveCount) {
        val before = previous
        previous = state
        if (state.moveCount == 0) return@LaunchedEffect
        val event = state.lastEvent
        onBusy(true)
        try {
            when (event) {
                is LudoEvent.Rolled -> motion.roll(event.value)
                is LudoEvent.Forfeit -> motion.roll(6)
                is LudoEvent.Moved -> motion.move(before, event)
                else -> Unit
            }
        } finally { onBusy(false) }
    }
    return motion
}
