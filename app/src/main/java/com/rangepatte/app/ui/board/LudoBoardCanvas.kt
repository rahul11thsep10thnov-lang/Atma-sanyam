package com.rangepatte.app.ui.board

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import com.rangepatte.app.domain.ludo.Cell
import com.rangepatte.app.domain.ludo.LudoBoard
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.ludo.LudoState
import kotlin.math.min

/** The royal-court palette of the approved board (stage 3, Design 10). */
object LudoPalette {
    val Ivory = Color(0xFFF3E7CB)
    val Rule = Color(0xFFC9B58A)
    val Gold = Color(0xFFC9A24B)
    val GoldDark = Color(0xFF8A6A2A)
    val Ink = Color(0xFF24160C)
    val Walnut = Color(0xFF5A3418)
    val WalnutDark = Color(0xFF2B1A0E)

    fun of(color: LudoColor): Color = when (color) {
        LudoColor.RED -> Color(0xFFB8352B); LudoColor.GREEN -> Color(0xFF2E7A4F); LudoColor.YELLOW -> Color(0xFFD9A62A); LudoColor.BLUE -> Color(0xFF2F4F8A)
    }
}

/**
 * The board (stage 3): ivory playing surface with a gold rim on waxed walnut, the yards in the suits'
 * deep red, emerald, saffron and indigo with ivory nests, faint ruling on the track, gold stars on the
 * eight safe squares, home columns in the yard colour, and a four-colour star under a gold medallion
 * at the centre. Tokens are drawn from [state] only — the renderer never decides where a token is.
 *
 * [highlight] marks the current player's movable tokens (they pulse in stage 4); a tap on one of them
 * calls [onTokenTap]. [emptyYards] are greyed (three-player games).
 */
@Composable
fun LudoBoardView(
    state: LudoState,
    highlight: List<Int>,
    onTokenTap: (token: Int) -> Unit,
    modifier: Modifier = Modifier,
    pulse: Float = 1f,
    /** Stage 4: the token in motion, captured tokens flying home, a shining safe square. */
    motion: MotionFrame = MotionFrame()
) {
    val measurer = rememberTextMeasurer()
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .pointerInput(state.turn, state.phase, highlight, motion.busy) {
                detectTapGestures { offset ->
                    if (motion.busy) return@detectTapGestures
                    val cell = cellAt(offset, size.width.toFloat())
                    val me = state.current
                    // The tapped cell's movable token (the first of a stack).
                    val hit = highlight.firstOrNull { t ->
                        val pos = me.tokens[t]
                        val c = LudoBoard.cellOf(me.color, pos) ?: LudoBoard.yardNests(me.color)[t]
                        c == cell
                    }
                    if (hit != null) onTokenTap(hit)
                }
            }
    ) {
        drawBoard(measurer, state, highlight.toSet(), pulse, motion)
    }
}

private fun cellAt(offset: Offset, widthPx: Float): Cell {
    val cell = widthPx / (LudoBoard.SIZE + 1.2f)
    val margin = cell * 0.6f
    return Cell(((offset.x - margin) / cell).toInt(), ((offset.y - margin) / cell).toInt())
}

private fun DrawScope.drawBoard(measurer: TextMeasurer, state: LudoState, highlight: Set<Int>, pulse: Float, motion: MotionFrame) {
    val s = min(size.width, size.height)
    val cell = s / (LudoBoard.SIZE + 1.2f)
    val margin = cell * 0.6f
    val board = cell * LudoBoard.SIZE
    fun x(c: Int) = margin + c * cell
    fun y(r: Int) = margin + r * cell
    fun centre(c: Cell) = Offset(x(c.col) + cell / 2f, y(c.row) + cell / 2f)

    // Walnut frame with a gold rim, then the ivory board.
    drawRoundRect(Brush.verticalGradient(listOf(LudoPalette.Walnut, LudoPalette.WalnutDark)), Offset.Zero, Size(s, s), CornerRadius(cell * 0.6f))
    drawRoundRect(LudoPalette.Gold, Offset(margin * 0.45f, margin * 0.45f), Size(s - margin * 0.9f, s - margin * 0.9f), CornerRadius(cell * 0.4f), style = Stroke(width = cell * 0.08f))
    drawRect(LudoPalette.Ivory, Offset(margin, margin), Size(board, board))

    val playing = state.players.map { it.color }.toSet()
    // Yards.
    LudoColor.values().forEach { color ->
        val o = LudoBoard.yardOrigin(color)
        val tint = if (color in playing) LudoPalette.of(color) else Color(0xFF9A8E7A)
        drawRect(tint, Offset(x(o.col), y(o.row)), Size(cell * 6, cell * 6))
        drawRoundRect(LudoPalette.Ivory, Offset(x(o.col) + cell, y(o.row) + cell), Size(cell * 4, cell * 4), CornerRadius(cell * 0.4f))
        LudoBoard.yardNests(color).forEach { n ->
            drawCircle(tint.copy(alpha = 0.35f), radius = cell * 0.42f, center = centre(n))
            drawCircle(tint, radius = cell * 0.42f, center = centre(n), style = Stroke(width = cell * 0.05f))
        }
    }
    // Track ruling.
    val rule = LudoPalette.Rule
    for (i in 0..LudoBoard.SIZE) {
        val px = x(i); val py = y(i)
        if (i in 6..9) {
            drawLine(rule, Offset(px, margin), Offset(px, margin + board), 1f * density)
            drawLine(rule, Offset(margin, py), Offset(margin + board, py), 1f * density)
        } else {
            drawLine(rule, Offset(px, y(6)), Offset(px, y(9)), 1f * density)
            drawLine(rule, Offset(x(6), py), Offset(x(9), py), 1f * density)
        }
    }
    // Home columns and start squares in the yard colour.
    LudoColor.values().forEach { color ->
        val tint = LudoPalette.of(color).copy(alpha = if (color in playing) 0.85f else 0.3f)
        LudoBoard.homeColumn(color).forEach { c -> drawRect(tint, Offset(x(c.col), y(c.row)), Size(cell, cell)) }
        val start = LudoBoard.TRACK[color.startIndex]
        drawRect(tint, Offset(x(start.col), y(start.row)), Size(cell, cell))
    }
    // Centre: four triangles and a gold medallion.
    val cx = x(7) + cell / 2f; val cy = y(7) + cell / 2f; val h = cell * 1.5f
    fun tri(a: Offset, b: Offset, color: Color) = drawPath(Path().apply { moveTo(cx, cy); lineTo(a.x, a.y); lineTo(b.x, b.y); close() }, color)
    tri(Offset(cx - h, cy - h), Offset(cx - h, cy + h), LudoPalette.of(LudoColor.RED))
    tri(Offset(cx - h, cy - h), Offset(cx + h, cy - h), LudoPalette.of(LudoColor.GREEN))
    tri(Offset(cx + h, cy - h), Offset(cx + h, cy + h), LudoPalette.of(LudoColor.YELLOW))
    tri(Offset(cx - h, cy + h), Offset(cx + h, cy + h), LudoPalette.of(LudoColor.BLUE))
    drawCircle(LudoPalette.Ivory, radius = cell * 0.75f, center = Offset(cx, cy))
    drawCircle(LudoPalette.Gold, radius = cell * 0.75f, center = Offset(cx, cy), style = Stroke(width = cell * 0.08f))
    drawStar(Offset(cx, cy), cell * 0.42f, LudoPalette.GoldDark)
    // Safe stars, and the shine on one just landed on.
    LudoBoard.SAFE_INDICES.forEach { i -> drawStar(centre(LudoBoard.TRACK[i]), cell * 0.3f, LudoPalette.GoldDark.copy(alpha = 0.7f)) }
    motion.shine?.let { (c, alpha) ->
        drawCircle(Color(0xFFF5C542).copy(alpha = 0.6f * alpha), radius = cell * (0.5f + 0.4f * (1f - alpha)), center = centre(c))
        drawStar(centre(c), cell * 0.3f, Color(0xFFF5C542).copy(alpha = alpha))
    }

    // Tokens: grouped per cell so stacks show a count; the current player's movable ones get a glow.
    data class Piece(val player: Int, val token: Int, val color: LudoColor)
    val suitStyle = TextStyle(fontSize = (cell * 0.45f / density).sp, fontWeight = FontWeight.Bold, color = LudoPalette.Ivory)
    val byCell = LinkedHashMap<Cell, MutableList<Piece>>()
    val inMotion = buildSet {
        motion.mover?.let { add(it.player to it.token) }
        motion.flying.forEach { add(it.player to it.token) }
    }
    state.players.forEachIndexed { pi, p ->
        p.tokens.forEachIndexed { ti, pos ->
            if (pos == LudoBoard.HOME || (pi to ti) in inMotion) return@forEachIndexed
            val c = LudoBoard.cellOf(p.color, pos) ?: LudoBoard.yardNests(p.color)[ti]
            byCell.getOrPut(c) { ArrayList() }.add(Piece(pi, ti, p.color))
        }
    }
    fun fractional(o: Offset) = Offset(margin + (o.x + 0.5f) * cell, margin + (o.y + 0.5f) * cell)
    fun drawPiece(at: Offset, color: LudoColor, radius: Float, alpha: Float = 1f) {
        drawCircle(Color.Black.copy(alpha = 0.35f * alpha), radius = radius, center = at + Offset(radius * 0.12f, radius * 0.22f))
        drawCircle(LudoPalette.of(color).copy(alpha = alpha), radius = radius, center = at)
        drawCircle(LudoPalette.Ivory.copy(alpha = alpha), radius = radius, center = at, style = Stroke(width = radius * 0.2f))
        if (alpha > 0.5f) {
            val text = measurer.measure(color.suit, suitStyle)
            drawText(text, topLeft = Offset(at.x - text.size.width / 2f, at.y - text.size.height / 2f))
        }
    }
    byCell.forEach { (c, pieces) ->
        val base = centre(c)
        val radius = cell * 0.36f
        pieces.forEachIndexed { i, piece ->
            val offset = if (pieces.size == 1) Offset.Zero else Offset((i - (pieces.size - 1) / 2f) * cell * 0.18f, (i % 2) * cell * 0.1f - cell * 0.05f)
            val at = base + offset
            val mine = piece.player == state.turn && piece.token in highlight
            if (mine) drawCircle(Color(0xFFF5C542).copy(alpha = 0.35f + 0.25f * pulse), radius = radius * (1.35f + 0.15f * pulse), center = at)
            drawCircle(Color.Black.copy(alpha = 0.35f), radius = radius, center = at + Offset(radius * 0.12f, radius * 0.22f))
            drawCircle(LudoPalette.of(piece.color), radius = radius, center = at)
            drawCircle(LudoPalette.Ivory, radius = radius, center = at, style = Stroke(width = radius * 0.2f))
            val text = measurer.measure(piece.color.suit, suitStyle)
            drawText(text, topLeft = Offset(at.x - text.size.width / 2f, at.y - text.size.height / 2f))
        }
        if (pieces.size > 1) {
            val label = measurer.measure("${pieces.size}", TextStyle(fontSize = (cell * 0.3f / density).sp, fontWeight = FontWeight.Black, color = LudoPalette.Ink))
            drawCircle(LudoPalette.Ivory, radius = cell * 0.2f, center = base + Offset(cell * 0.3f, -cell * 0.3f))
            drawText(label, topLeft = Offset(base.x + cell * 0.3f - label.size.width / 2f, base.y - cell * 0.3f - label.size.height / 2f))
        }
    }
    // Stage 4 (Glide): the fading trail, the gliding token lifted on its arc, and captured tokens flying home.
    motion.mover?.let { m ->
        val color = state.players[m.player].color
        val radius = cell * 0.36f
        m.trail.forEachIndexed { i, o -> drawCircle(LudoPalette.of(color).copy(alpha = 0.28f - i * 0.06f), radius = radius * (0.8f - i * 0.12f), center = fractional(o)) }
        val at = fractional(m.at) - Offset(0f, cell * 0.35f * m.lift)
        drawCircle(Color.Black.copy(alpha = 0.3f), radius = radius * (1f + 0.3f * m.lift), center = fractional(m.at) + Offset(0f, radius * 0.3f))
        drawPiece(at, color, radius * (1f + 0.15f * m.lift))
    }
    motion.flying.forEach { f ->
        drawPiece(fractional(f.at), state.players[f.player].color, cell * 0.36f * f.scale, alpha = (0.4f + 0.6f * f.scale).coerceIn(0f, 1f))
    }
    // Finished tokens: small discs around the medallion.
    state.players.forEach { p ->
        val home = p.finished
        if (home > 0) {
            val dir = when (p.color) { LudoColor.RED -> Offset(-1f, 0f); LudoColor.GREEN -> Offset(0f, -1f); LudoColor.YELLOW -> Offset(1f, 0f); LudoColor.BLUE -> Offset(0f, 1f) }
            repeat(home) { i ->
                val at = Offset(cx, cy) + dir * (cell * 0.95f) + Offset(-dir.y, dir.x) * ((i - (home - 1) / 2f) * cell * 0.3f)
                drawCircle(LudoPalette.of(p.color), radius = cell * 0.13f, center = at)
            }
        }
    }
}

private fun DrawScope.drawStar(center: Offset, radius: Float, color: Color) {
    val path = Path()
    for (i in 0 until 10) {
        val r = if (i % 2 == 0) radius else radius * 0.45f
        val a = Math.toRadians((i * 36 - 90).toDouble())
        val p = Offset(center.x + (r * Math.cos(a)).toFloat(), center.y + (r * Math.sin(a)).toFloat())
        if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
    }
    path.close()
    drawPath(path, color)
}
