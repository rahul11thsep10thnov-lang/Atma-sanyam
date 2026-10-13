package com.rangepatte.app.ui.snakes

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
import com.rangepatte.app.domain.snakes.Outcome
import com.rangepatte.app.game.snakes.SnakesSfx
import com.rangepatte.app.domain.snakes.SnakesBoard
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.domain.snakes.SnakesTurn
import com.rangepatte.app.ui.board.DieFrame
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/**
 * Runs the animations a Moksha Patam turn calls for (stage 4, the Glide family): the die spins and
 * settles, the token glides square by square along the numbering, then climbs the ladder in a
 * straight line or slides down the serpent's own curve. [reduceMotion] snaps everything.
 */
class SnakesMotion(private val reduceMotion: Boolean) {
    var frame: SnakesFrame by mutableStateOf(SnakesFrame())
        private set
    var die: DieFrame by mutableStateOf(DieFrame(null, 0f, false, 0f))
        private set
    val busy: Boolean get() = frame.busy || die.rolling

    private val spin = Animatable(0f)
    private val progress = Animatable(0f)
    private val flash = Animatable(0f)

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

    /** The glide from [SnakesTurn.from] to [SnakesTurn.landed], then the jump to [SnakesTurn.to]. */
    suspend fun move(t: SnakesTurn) {
        if (t.outcome == Outcome.STAYED || t.outcome == Outcome.NO_ENTRY) return
        if (reduceMotion) { frame = SnakesFrame(); return }
        val path = (listOf(t.from) + SnakesBoard.path(t.from, t.landed)).map { squareOffset(it) }
        if (path.size > 1) {
            val duration = maxOf(550, SnakesSfx.STEP_MS.toInt() * (path.size - 1))
            progress.snapTo(0f)
            progress.animateTo(1f, tween(duration, easing = LinearEasing)) {
                val x = this.value * (path.size - 1)
                val i = x.toInt().coerceAtMost(path.size - 2)
                val f = x - i
                val a = path[i]; val b = path[i + 1]
                val at = Offset(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f)
                val trail = (1..4).mapNotNull { k ->
                    val tt = x - k * 0.6f; if (tt < 0) null else {
                        val j = tt.toInt().coerceAtMost(path.size - 2); val g = tt - j
                        Offset(path[j].x + (path[j + 1].x - path[j].x) * g, path[j].y + (path[j + 1].y - path[j].y) * g)
                    }
                }
                frame = SnakesFrame(mover = SnakesFrame.Mover(t.player, at, sin(this.value * PI).toFloat() * 0.6f, trail))
            }
        }
        if (t.to != t.landed) {
            val climbing = t.to > t.landed
            progress.snapTo(0f)
            progress.animateTo(1f, tween(SnakesSfx.JUMP_MS.toInt(), easing = FastOutSlowInEasing)) {
                val v = this.value
                val at = if (climbing) {
                    val a = squareOffset(t.landed); val b = squareOffset(t.to)
                    Offset(a.x + (b.x - a.x) * v, a.y + (b.y - a.y) * v)
                } else serpentPoint(t.landed, t.to, v)
                frame = SnakesFrame(mover = SnakesFrame.Mover(t.player, at, if (climbing) 0.3f else 0f, emptyList()), faded = t.captured.toSet())
            }
        }
        frame = SnakesFrame()
    }
}

/** Watches the state's turns and drives [SnakesMotion]; the table is told while motion is busy. */
@Composable
fun rememberSnakesMotion(state: SnakesState, reduceMotion: Boolean, onBusy: (Boolean) -> Unit): SnakesMotion {
    val motion = remember { SnakesMotion(reduceMotion) }
    LaunchedEffect(state.moveCount) {
        if (state.moveCount == 0) return@LaunchedEffect
        val t = state.last ?: return@LaunchedEffect
        onBusy(true)
        try { motion.roll(t.value); motion.move(t) } finally { onBusy(false) }
    }
    return motion
}
