package com.rangepatte.app.ui.snakes

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.snakes.SnakesBoard
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.ui.board.LudoPalette
import kotlin.math.cos
import kotlin.math.sin

/** Where a square sits, in cell units from the board's top-left (row 0 at the top); square 0 waits left of square 1. */
fun squareOffset(square: Int): Offset {
    if (square == SnakesBoard.START) return Offset(-0.62f, SnakesBoard.SIZE - 0.5f)
    val (col, row) = SnakesBoard.cellOf(square)
    return Offset(col + 0.5f, SnakesBoard.SIZE - 1 - row + 0.5f)
}

/** A point along a serpent's body from its head to its tail, 0..1 — the same curve the board draws. */
fun serpentPoint(head: Int, tail: Int, t: Float): Offset {
    val a = squareOffset(head); val b = squareOffset(tail)
    val mid = Offset((a.x + b.x) / 2f, (a.y + b.y) / 2f)
    val dx = b.x - a.x; val dy = b.y - a.y
    val len = kotlin.math.sqrt(dx * dx + dy * dy).coerceAtLeast(0.01f)
    val bend = ((head * 7) % 5 - 2) * 0.35f + 1.1f
    val c = Offset(mid.x - dy / len * bend, mid.y + dx / len * bend)
    val u = 1f - t
    return Offset(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y)
}

/** One frame of motion (stage 4): the token on the move, drawn at [at] (cell units) instead of its square. */
data class SnakesFrame(val mover: Mover? = null, val faded: Set<Int> = emptySet()) {
    data class Mover(val player: Int, val at: Offset, val lift: Float, val trail: List<Offset>)
    val busy: Boolean get() = mover != null
}

/**
 * The Moksha Patam board (stage 3, Royal court): the ivory hundred squares on waxed walnut inside a
 * gold rim, numbered back and forth, every other square tinted; the eight creeper ladders and nine
 * serpents of [SnakesBoard] drawn from the same tables the engine uses; the tokens as suit-marked
 * discs, sharing a square side by side; the lotus on the hundredth square.
 */
@Composable
fun SnakesBoardView(state: SnakesState, modifier: Modifier = Modifier, pulse: Float = 1f, motion: SnakesFrame = SnakesFrame()) {
    val measurer = rememberTextMeasurer()
    Canvas(modifier = modifier.fillMaxWidth().aspectRatio(1f)) { drawSnakesBoard(measurer, state, pulse, motion) }
}

private val Lotus = Color(0xFFE88AA0)
private val LotusDark = Color(0xFFB8465F)
private val SerpentDark = Color(0xFF163D27)
private val Serpent = Color(0xFF2E7A4F)
private val Crimson = Color(0xFFB8352B)

private fun DrawScope.drawSnakesBoard(measurer: TextMeasurer, state: SnakesState, pulse: Float, motion: SnakesFrame) {
    val s = size.width
    val cell = s / (SnakesBoard.SIZE + 1.4f)
    val margin = cell * 0.7f
    val boardSize = cell * SnakesBoard.SIZE
    fun px(o: Offset) = Offset(margin + o.x * cell, margin + o.y * cell)

    // Waxed walnut with a gold rim, then the ivory board.
    drawRoundRect(LudoPalette.WalnutDark, Offset.Zero, Size(s, s), CornerRadius(s * 0.02f))
    drawRoundRect(LudoPalette.Walnut, Offset(s * 0.015f, s * 0.015f), Size(s * 0.97f, s * 0.97f), CornerRadius(s * 0.015f))
    drawRoundRect(LudoPalette.Gold, Offset(s * 0.015f, s * 0.015f), Size(s * 0.97f, s * 0.97f), CornerRadius(s * 0.015f), style = Stroke(s * 0.008f))
    drawRect(LudoPalette.Ivory, Offset(margin, margin), Size(boardSize, boardSize))
    val numberStyle = TextStyle(fontSize = (cell * 0.21f / density).sp, fontWeight = FontWeight.SemiBold, color = LudoPalette.GoldDark)
    for (sq in 1..SnakesBoard.LAST) {
        val c = squareOffset(sq)
        val topLeft = px(Offset(c.x - 0.5f, c.y - 0.5f))
        val (col, row) = SnakesBoard.cellOf(sq)
        if ((col + row) % 2 == 0) drawRect(LudoPalette.Rule.copy(alpha = 0.28f), topLeft, Size(cell, cell))
        val label = measurer.measure("$sq", numberStyle)
        drawText(label, topLeft = topLeft + Offset(cell * 0.08f, cell * 0.04f))
    }
    for (i in 0..SnakesBoard.SIZE) {
        drawLine(LudoPalette.Rule, Offset(margin + cell * i, margin), Offset(margin + cell * i, margin + boardSize), strokeWidth = s * 0.0025f)
        drawLine(LudoPalette.Rule, Offset(margin, margin + cell * i), Offset(margin + boardSize, margin + cell * i), strokeWidth = s * 0.0025f)
    }
    drawRect(LudoPalette.GoldDark, Offset(margin, margin), Size(boardSize, boardSize), style = Stroke(s * 0.006f))

    // The lotus of liberation on the hundredth square.
    val goal = px(squareOffset(SnakesBoard.LAST))
    for (k in 0 until 8) {
        val ang = k * (Math.PI / 4).toFloat()
        drawCircle(if (k % 2 == 0) Lotus else LotusDark, cell * 0.16f, Offset(goal.x + cos(ang) * cell * 0.22f, goal.y + sin(ang) * cell * 0.22f))
    }
    drawCircle(LudoPalette.Gold, cell * 0.13f, goal)

    // Creeper ladders: gold rails, green rungs.
    SnakesBoard.LADDERS.forEach { (foot, top) ->
        val a = px(squareOffset(foot)); val b = px(squareOffset(top))
        val dx = b.x - a.x; val dy = b.y - a.y
        val len = kotlin.math.sqrt(dx * dx + dy * dy)
        val nx = -dy / len * cell * 0.2f; val ny = dx / len * cell * 0.2f
        drawLine(LudoPalette.GoldDark, Offset(a.x + nx, a.y + ny), Offset(b.x + nx, b.y + ny), strokeWidth = cell * 0.1f, cap = StrokeCap.Round)
        drawLine(LudoPalette.GoldDark, Offset(a.x - nx, a.y - ny), Offset(b.x - nx, b.y - ny), strokeWidth = cell * 0.1f, cap = StrokeCap.Round)
        val rungs = (len / (cell * 0.5f)).toInt().coerceAtLeast(2)
        for (i in 1 until rungs) {
            val t = i.toFloat() / rungs
            val p = Offset(a.x + dx * t, a.y + dy * t)
            drawLine(Serpent, Offset(p.x + nx, p.y + ny), Offset(p.x - nx, p.y - ny), strokeWidth = cell * 0.08f, cap = StrokeCap.Round)
        }
    }

    // Serpents: a bent body from head to tail with a crimson belly line, the lotus head on the head square.
    SnakesBoard.SNAKES.forEach { (head, tail) ->
        val path = Path()
        val steps = 24
        for (i in 0..steps) {
            val p = px(serpentPoint(head, tail, i / steps.toFloat()))
            if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
        }
        drawPath(path, SerpentDark, style = Stroke(cell * 0.3f, cap = StrokeCap.Round))
        drawPath(path, Serpent, style = Stroke(cell * 0.2f, cap = StrokeCap.Round))
        drawPath(path, Crimson.copy(alpha = 0.8f), style = Stroke(cell * 0.05f, cap = StrokeCap.Round))
        val h = px(squareOffset(head))
        for (k in 0 until 6) {
            val ang = k * (Math.PI / 3).toFloat()
            drawCircle(if (k % 2 == 0) Lotus else LotusDark, cell * 0.12f, Offset(h.x + cos(ang) * cell * 0.17f, h.y + sin(ang) * cell * 0.17f))
        }
        drawCircle(SerpentDark, cell * 0.1f, h)
        drawCircle(LudoPalette.Gold, cell * 0.04f, Offset(h.x - cell * 0.04f, h.y - cell * 0.03f))
        drawCircle(LudoPalette.Gold, cell * 0.04f, Offset(h.x + cell * 0.04f, h.y - cell * 0.03f))
    }

    // Tokens: grouped per square, side by side; the current player's glows.
    val suitStyle = TextStyle(fontSize = (cell * 0.4f / density).sp, fontWeight = FontWeight.Bold, color = LudoPalette.Ivory)
    fun drawPiece(at: Offset, color: LudoColor, radius: Float, alpha: Float = 1f) {
        drawCircle(Color.Black.copy(alpha = 0.35f * alpha), radius = radius, center = at + Offset(radius * 0.12f, radius * 0.22f))
        drawCircle(LudoPalette.of(color).copy(alpha = alpha), radius = radius, center = at)
        drawCircle(LudoPalette.Ivory.copy(alpha = alpha), radius = radius, center = at, style = Stroke(width = radius * 0.2f))
        val text = measurer.measure(color.suit, suitStyle)
        drawText(text, topLeft = Offset(at.x - text.size.width / 2f, at.y - text.size.height / 2f), alpha = alpha)
    }
    val bySquare = state.players.withIndex().filter { (i, _) -> motion.mover?.player != i }.groupBy { (_, p) -> p.square }
    bySquare.forEach { (sq, players) ->
        val base = px(squareOffset(sq))
        val radius = cell * 0.3f
        players.forEachIndexed { i, (seat, p) ->
            val offset = if (players.size == 1) Offset.Zero else Offset((i - (players.size - 1) / 2f) * cell * 0.28f, (i % 2) * cell * 0.12f - cell * 0.06f)
            val at = base + offset
            if (seat == state.turn && state.phase == com.rangepatte.app.domain.snakes.SnakesPhase.ROLL) {
                drawCircle(Color(0xFFF5C542).copy(alpha = 0.3f + 0.25f * pulse), radius = radius * (1.35f + 0.15f * pulse), center = at)
            }
            drawPiece(at, p.color, radius, alpha = if (seat in motion.faded) 0.45f else 1f)
        }
    }
    // Stage 4: the gliding token with its fading trail and a little lift.
    motion.mover?.let { m ->
        val color = state.players[m.player].color
        val radius = cell * 0.3f
        m.trail.forEachIndexed { i, o -> drawCircle(LudoPalette.of(color).copy(alpha = 0.28f - i * 0.06f), radius = radius * (0.8f - i * 0.12f), center = px(o)) }
        drawCircle(Color.Black.copy(alpha = 0.3f), radius = radius * (1f + 0.3f * m.lift), center = px(m.at) + Offset(0f, radius * 0.3f))
        drawPiece(px(m.at) - Offset(0f, cell * 0.35f * m.lift), color, radius * (1f + 0.15f * m.lift))
    }
}
