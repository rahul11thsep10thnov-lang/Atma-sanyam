package com.rangepatte.app.ui.board

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.ui.graphics.lerp
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
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoState
import kotlin.math.min

/**
 * The board's palette: the bright flat colours of the printed Ludo board (red, green, sky blue and
 * yellow on white cells with thin black lines). The wood and gold are the Moksha Patam board's frame.
 */
object LudoPalette {
    val Ivory = Color(0xFFF3E7CB)
    val Rule = Color(0xFFC9B58A)
    val Gold = Color(0xFFD9B04C)
    val GoldDark = Color(0xFF8A6A2A)
    val Ink = Color(0xFF24160C)
    /** The thin black of the printed board's grid and outlines. */
    val Line = Color(0xFF111111)
    val Walnut = Color(0xFF8B5A2B)
    val WalnutDark = Color(0xFF4A2A12)
    val Cream = Color(0xFFF2ECDF)
    val Tile = Color(0xFFFCFAF5)
    val TileShade = Color(0xFFD8D1C3)

    fun of(color: LudoColor): Color = when (color) {
        LudoColor.RED -> Color(0xFFFF1018); LudoColor.GREEN -> Color(0xFF25E500); LudoColor.YELLOW -> Color(0xFFFFF500); LudoColor.BLUE -> Color(0xFF55C7F5)
    }

    fun dark(color: LudoColor): Color = lerp(of(color), Color.Black, 0.35f)
    fun light(color: LudoColor): Color = lerp(of(color), Color.White, 0.45f)
}

/** Quarter turns clockwise that bring [color]'s yard to the bottom-left corner of the screen. */
fun ludoQuarterTurns(color: LudoColor): Int = (3 - color.ordinal + 4) % 4

/** The screen corner [color]'s yard ends up in after [quarterTurns]: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left. */
fun ludoScreenCorner(color: LudoColor, quarterTurns: Int): Int = (color.ordinal + quarterTurns) % 4

/** Rotates a point in board units (0..15) clockwise [turns] quarter turns about the board's centre. */
fun rotateBoard(x: Float, y: Float, turns: Int): Offset {
    var px = x; var py = y
    repeat(((turns % 4) + 4) % 4) { val nx = LudoBoard.SIZE - py; py = px; px = nx }
    return Offset(px, py)
}

/**
 * The board: the standard Ludo board — bright yards with a white circle and four pawns, white
 * bevelled track tiles, coloured home columns, coloured start and star squares with white stars,
 * arrows into each home column and the four-colour centre — set in the royal court's waxed-wood
 * frame with a gold rim and leaf corners. [quarterTurns] turns the picture (never the rules) so the
 * player's own yard sits at the bottom-left. Tokens are drawn from [state] only.
 *
 * [highlight] marks the current player's movable tokens (they pulse); a tap on one calls [onTokenTap].
 */
@Composable
fun LudoBoardView(
    state: LudoState,
    highlight: List<Int>,
    onTokenTap: (token: Int) -> Unit,
    modifier: Modifier = Modifier,
    pulse: Float = 1f,
    /** Stage 4: the token in motion, captured tokens flying home, a shining safe square. */
    motion: MotionFrame = MotionFrame(),
    quarterTurns: Int = 0
) {
    val measurer = rememberTextMeasurer()
    Canvas(
        modifier = modifier
            .pointerInput(state.turn, state.phase, highlight, motion.busy, quarterTurns) {
                detectTapGestures { offset ->
                    if (motion.busy) return@detectTapGestures
                    val at = boardPointAt(offset, size.width.toFloat(), size.height.toFloat(), quarterTurns)
                    val me = state.current
                    // The token whose resting place is nearest the tap, if it is near enough (about a cell).
                    val hit = highlight.mapNotNull { t ->
                        val pos = me.tokens[t]
                        val c = LudoBoard.cellOf(me.color, pos)
                        val centre = if (c != null) Offset(c.col + 0.5f, c.row + 0.5f) else LudoBoard.nestPoint(me.color, t).let { Offset(it.x + 0.5f, it.y + 0.5f) }
                        val d = (centre - at).getDistance()
                        if (d <= 0.8f) t to d else null
                    }.minByOrNull { it.second }?.first
                    if (hit != null) onTokenTap(hit)
                }
            }
    ) {
        drawLudoBoard(measurer, state, highlight.toSet(), pulse, motion, quarterTurns)
    }
}

/**
 * The board's geometry for a canvas of [w] × [h]: the frame margin (the same on every side) and the
 * width and height of one cell. The board may be stretched out of square to fill the room it is given;
 * round things (circles, pawns, stars) are then sized by the smaller of the two cell sides.
 */
private class LudoGeometry(w: Float, h: Float) {
    val margin = min(w, h) / (LudoBoard.SIZE + 1.1f) * 0.55f
    val cellX = (w - margin * 2) / LudoBoard.SIZE
    val cellY = (h - margin * 2) / LudoBoard.SIZE
    val cell = min(cellX, cellY)
}

/** The point on the board, in board units, under a tap, undoing the picture's rotation. */
private fun boardPointAt(offset: Offset, widthPx: Float, heightPx: Float, turns: Int): Offset {
    val g = LudoGeometry(widthPx, heightPx)
    val x = (offset.x - g.margin) / g.cellX
    val y = (offset.y - g.margin) / g.cellY
    return rotateBoard(x, y, 4 - (turns % 4))
}

private fun DrawScope.drawLudoBoard(measurer: TextMeasurer, state: LudoState, highlight: Set<Int>, pulse: Float, motion: MotionFrame, turns: Int) {
    val g = LudoGeometry(size.width, size.height)
    val w = size.width
    val h = size.height
    val cell = g.cell
    val margin = g.margin
    /** A point in board units to the screen. */
    fun p(x: Float, y: Float): Offset { val r = rotateBoard(x, y, turns); return Offset(margin + r.x * g.cellX, margin + r.y * g.cellY) }
    fun centre(c: Cell) = p(c.col + 0.5f, c.row + 0.5f)
    /** The screen rectangle of a block of cells (rotation keeps it axis-aligned). */
    fun rect(col: Float, row: Float, w: Float, h: Float): Pair<Offset, Size> {
        val a = p(col, row); val b = p(col + w, row + h)
        return Offset(min(a.x, b.x), min(a.y, b.y)) to Size(kotlin.math.abs(a.x - b.x), kotlin.math.abs(a.y - b.y))
    }

    // The printed board, flat: a thin black border, white cells with thin black lines, colour quadrants.
    val line = maxOf(1f, cell * 0.022f)
    val ink = LudoPalette.Line
    drawRect(ink, Offset.Zero, Size(w, h))
    drawRect(Color.White, Offset(margin, margin), Size(g.cellX * LudoBoard.SIZE, g.cellY * LudoBoard.SIZE))

    val playing = state.players.map { it.color }.toSet()
    val turnColor = if (state.phase != LudoPhase.OVER) state.current.color else null
    fun tint(color: LudoColor) = if (color in playing) LudoPalette.of(color) else Color(0xFFC9C2B6)

    // Yards: the whole 6 × 6 quadrant in the colour, a white square inside it (one cell in from each
    // side) and four circles in a 2 × 2 grid for the tokens.
    LudoColor.values().forEach { color ->
        val o = LudoBoard.yardOrigin(color)
        val base = tint(color)
        val (qtl, qsz) = rect(o.col.toFloat(), o.row.toFloat(), 6f, 6f)
        drawRect(base, qtl, qsz)
        drawRect(ink, qtl, qsz, style = Stroke(line))
        // Whose turn it is: the quadrant's edge glows gold.
        if (color == turnColor) {
            val glow = cell * (0.22f + 0.1f * pulse)
            drawRect(Color(0xFFFFC21A).copy(alpha = 0.7f + 0.3f * pulse), qtl + Offset(glow / 2f, glow / 2f), Size(qsz.width - glow, qsz.height - glow), style = Stroke(glow))
        }
        val (wtl, wsz) = rect(o.col + 1f, o.row + 1f, 4f, 4f)
        drawRect(Color.White, wtl, wsz)
        drawRect(ink, wtl, wsz, style = Stroke(line))
        for (t in 0 until 4) {
            val n = LudoBoard.nestPoint(color, t)
            val c = p(n.x + 0.5f, n.y + 0.5f)
            drawCircle(base, radius = cell * 0.56f, center = c)
            drawCircle(ink, radius = cell * 0.56f, center = c, style = Stroke(line))
        }
    }

    // Track cells, home lanes, starts, safe stars and entry arrows.
    fun tile(c: Cell, fill: Color) {
        val (tl, sz) = rect(c.col.toFloat(), c.row.toFloat(), 1f, 1f)
        drawRect(fill, tl, sz)
        drawRect(ink, tl, sz, style = Stroke(line))
    }
    LudoBoard.TRACK.forEach { tile(it, Color.White) }
    LudoColor.values().forEach { color ->
        val tintColor = tint(color)
        LudoBoard.homeColumn(color).forEach { tile(it, tintColor) }
        // The start square is coloured; the star (the safe square eight on) is the colour on white.
        tile(LudoBoard.TRACK[color.startIndex], tintColor)
        val star = LudoBoard.TRACK[(color.startIndex + 8) % LudoBoard.TRACK_LENGTH]
        tile(star, Color.White)
        drawStar(centre(star), cell * 0.36f, tintColor, ink, line)
        // The arrow on the square before the home lane, pointing in.
        val (entry, dir) = when (color) {
            LudoColor.RED -> Cell(0, 7) to Offset(1f, 0f)
            LudoColor.GREEN -> Cell(7, 0) to Offset(0f, 1f)
            LudoColor.YELLOW -> Cell(14, 7) to Offset(-1f, 0f)
            LudoColor.BLUE -> Cell(7, 14) to Offset(0f, -1f)
        }
        val from = p(entry.col + 0.5f - dir.x * 0.3f, entry.row + 0.5f - dir.y * 0.3f)
        val to = p(entry.col + 0.5f + dir.x * 0.3f, entry.row + 0.5f + dir.y * 0.3f)
        drawArrow(from, to, tintColor, cell, ink)
    }
    motion.shine?.let { (c, alpha) ->
        drawCircle(Color(0xFFFFE082).copy(alpha = 0.7f * alpha), radius = cell * (0.5f + 0.5f * (1f - alpha)), center = centre(c))
    }

    // Centre: the four triangles meeting at the middle, divided by thin black lines.
    val cx = p(7.5f, 7.5f)
    fun tri(a: Offset, b: Offset, color: LudoColor) {
        val path = Path().apply { moveTo(cx.x, cx.y); lineTo(a.x, a.y); lineTo(b.x, b.y); close() }
        drawPath(path, tint(color))
        drawPath(path, ink, style = Stroke(line))
    }
    tri(p(6f, 6f), p(6f, 9f), LudoColor.RED)
    tri(p(6f, 6f), p(9f, 6f), LudoColor.GREEN)
    tri(p(9f, 6f), p(9f, 9f), LudoColor.YELLOW)
    tri(p(6f, 9f), p(9f, 9f), LudoColor.BLUE)

    // Tokens, grouped per cell; the current player's movable ones get a pulsing gold ring.
    data class Piece(val player: Int, val token: Int, val color: LudoColor)
    val byCell = LinkedHashMap<Cell, MutableList<Piece>>()
    val inMotion = buildSet {
        motion.mover?.let { add(it.player to it.token) }
        motion.flying.forEach { add(it.player to it.token) }
    }
    state.players.forEachIndexed { pi, pl ->
        pl.tokens.forEachIndexed { ti, pos ->
            if (pos == LudoBoard.HOME || (pi to ti) in inMotion) return@forEachIndexed
            val c = LudoBoard.cellOf(pl.color, pos) ?: LudoBoard.yardNests(pl.color)[ti]
            byCell.getOrPut(c) { ArrayList() }.add(Piece(pi, ti, pl.color))
        }
    }
    byCell.forEach { (c, pieces) ->
        val inYard = pieces.all { state.players[it.player].tokens[it.token] == LudoBoard.YARD }
        // A token in its yard stands on its own circle; any other on the middle of its cell.
        val base = if (inYard) LudoBoard.nestPoint(pieces[0].color, pieces[0].token).let { p(it.x + 0.5f, it.y + 0.5f) } else centre(c)
        val height = cell * (if (inYard) 0.95f else 0.82f)
        pieces.forEachIndexed { i, piece ->
            val offset = if (pieces.size == 1) Offset.Zero else Offset((i - (pieces.size - 1) / 2f) * cell * 0.2f, (i % 2) * cell * 0.08f)
            val foot = base + offset + Offset(0f, cell * 0.3f)
            val mine = piece.player == state.turn && piece.token in highlight
            if (mine) {
                drawOval(Color(0xFFFFD54F).copy(alpha = 0.45f + 0.35f * pulse), foot - Offset(cell * 0.5f, cell * 0.2f), Size(cell * 1.0f, cell * 0.4f))
                drawCircle(Color(0xFFFFD54F).copy(alpha = 0.5f + 0.4f * pulse), radius = cell * (0.55f + 0.08f * pulse), center = foot - Offset(0f, height * 0.45f), style = Stroke(width = cell * 0.09f))
            }
            drawPawn(foot, height, piece.color)
        }
        if (pieces.size > 1) {
            val label = measurer.measure("${pieces.size}", TextStyle(fontSize = (cell * 0.3f / density).sp, fontWeight = FontWeight.Black, color = LudoPalette.Ink))
            val bubble = base + Offset(cell * 0.32f, -cell * 0.36f)
            drawCircle(Color.White, radius = cell * 0.2f, center = bubble)
            drawCircle(LudoPalette.GoldDark, radius = cell * 0.2f, center = bubble, style = Stroke(width = cell * 0.04f))
            drawText(label, topLeft = Offset(bubble.x - label.size.width / 2f, bubble.y - label.size.height / 2f))
        }
    }
    // Stage 4 (Glide): the fading trail, the gliding pawn lifted on its arc, captured pawns flying home.
    fun fractional(o: Offset) = p(o.x + 0.5f, o.y + 0.5f)
    motion.mover?.let { m ->
        val color = state.players[m.player].color
        m.trail.forEachIndexed { i, o -> drawCircle(LudoPalette.of(color).copy(alpha = 0.3f - i * 0.06f), radius = cell * (0.3f - i * 0.04f), center = fractional(o)) }
        val ground = fractional(m.at) + Offset(0f, cell * 0.3f)
        drawOval(Color.Black.copy(alpha = 0.25f), ground - Offset(cell * 0.3f, cell * 0.08f), Size(cell * 0.6f, cell * 0.16f))
        drawPawn(ground - Offset(0f, cell * 0.45f * m.lift), cell * (0.82f + 0.12f * m.lift), color, shadow = false)
    }
    motion.flying.forEach { f ->
        drawPawn(fractional(f.at) + Offset(0f, cell * 0.3f), cell * 0.82f * f.scale.coerceAtLeast(0.2f), state.players[f.player].color, alpha = (0.4f + 0.6f * f.scale).coerceIn(0f, 1f))
    }
    // Finished pawns: small ones on their colour's triangle.
    state.players.forEach { pl ->
        val home = pl.finished
        if (home > 0) {
            val (bx, by) = when (pl.color) { LudoColor.RED -> 6.55f to 7.5f; LudoColor.GREEN -> 7.5f to 6.55f; LudoColor.YELLOW -> 8.45f to 7.5f; LudoColor.BLUE -> 7.5f to 8.45f }
            val along = if (pl.color == LudoColor.RED || pl.color == LudoColor.YELLOW) Offset(0f, 1f) else Offset(1f, 0f)
            repeat(home) { i ->
                val k = (i - (home - 1) / 2f) * 0.42f
                drawPawn(p(bx + along.x * k, by + along.y * k + 0.22f), cell * 0.5f, pl.color)
            }
        }
    }
}

/**
 * A matte pawn (the classic goti) standing with its foot at [foot]: a broad rounded base, a gently
 * tapering body, a narrow neck and a round head, in soft diffuse shading with no glossy highlight, and
 * a small contact shadow on the board.
 */
internal fun DrawScope.drawPawn(foot: Offset, height: Float, color: LudoColor, alpha: Float = 1f, shadow: Boolean = true) {
    val base = LudoPalette.of(color)
    val edge = lerp(base, Color.Black, 0.34f)
    val soft = lerp(base, Color.White, 0.14f)
    val rim = lerp(base, Color.Black, 0.55f).copy(alpha = alpha)
    val w = height * 0.66f
    if (shadow) {
        drawOval(Color.Black.copy(alpha = 0.12f * alpha), foot - Offset(w * 0.68f, height * 0.1f), Size(w * 1.36f, height * 0.26f))
        drawOval(Color.Black.copy(alpha = 0.3f * alpha), foot - Offset(w * 0.54f, height * 0.06f), Size(w * 1.08f, height * 0.16f))
    }
    val neckY = foot.y - height * 0.6f
    val body = Path().apply {
        moveTo(foot.x - w * 0.5f, foot.y - height * 0.07f)
        cubicTo(foot.x - w * 0.52f, foot.y - height * 0.21f, foot.x - w * 0.2f, foot.y - height * 0.22f, foot.x - w * 0.12f, neckY)
        lineTo(foot.x + w * 0.12f, neckY)
        cubicTo(foot.x + w * 0.2f, foot.y - height * 0.22f, foot.x + w * 0.52f, foot.y - height * 0.21f, foot.x + w * 0.5f, foot.y - height * 0.07f)
        quadraticTo(foot.x, foot.y + height * 0.05f, foot.x - w * 0.5f, foot.y - height * 0.07f)
        close()
    }
    drawPath(body, Brush.horizontalGradient(listOf(edge, base, soft, base, edge), foot.x - w * 0.5f, foot.x + w * 0.5f), alpha = alpha)
    drawPath(body, rim, style = Stroke(maxOf(1f, height * 0.018f)))
    val r = height * 0.2f
    val head = Offset(foot.x, neckY - r * 0.7f)
    drawCircle(Brush.radialGradient(listOf(soft, base, edge), center = head - Offset(r * 0.3f, r * 0.35f), radius = r * 1.5f), radius = r, center = head, alpha = alpha)
    drawCircle(rim, radius = r, center = head, style = Stroke(maxOf(1f, height * 0.018f)))
}

/** An arrow in [color] with a thin black outline, as printed on the board. */
private fun DrawScope.drawArrow(from: Offset, to: Offset, color: Color, cell: Float, outline: Color) {
    val dx = to.x - from.x; val dy = to.y - from.y
    val len = kotlin.math.sqrt(dx * dx + dy * dy).coerceAtLeast(0.01f)
    val ux = dx / len; val uy = dy / len
    val shaft = Path().apply {
        val hw = cell * 0.055f
        val tail = from; val neck = to - Offset(ux * cell * 0.2f, uy * cell * 0.2f)
        moveTo(tail.x - uy * hw, tail.y + ux * hw); lineTo(neck.x - uy * hw, neck.y + ux * hw)
        lineTo(neck.x - uy * cell * 0.17f, neck.y + ux * cell * 0.17f); lineTo(to.x + ux * cell * 0.02f, to.y + uy * cell * 0.02f)
        lineTo(neck.x + uy * cell * 0.17f, neck.y - ux * cell * 0.17f); lineTo(neck.x + uy * hw, neck.y - ux * hw)
        lineTo(tail.x + uy * hw, tail.y - ux * hw); close()
    }
    drawPath(shaft, color)
    drawPath(shaft, outline, style = Stroke(maxOf(1f, cell * 0.02f)))
}

internal fun DrawScope.drawStar(center: Offset, radius: Float, color: Color, outline: Color? = null, outlineWidth: Float = 1f) {
    val path = Path()
    for (i in 0 until 10) {
        val r = if (i % 2 == 0) radius else radius * 0.45f
        val a = Math.toRadians((i * 36 - 90).toDouble())
        val pt = Offset(center.x + (r * Math.cos(a)).toFloat(), center.y + (r * Math.sin(a)).toFloat())
        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
    }
    path.close()
    drawPath(path, color)
    if (outline != null) drawPath(path, outline, style = Stroke(outlineWidth))
}
