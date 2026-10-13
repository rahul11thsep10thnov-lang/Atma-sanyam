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
 * The board's palette: the bright standard Ludo colours on a cream board, framed in the royal court's
 * waxed wood and gold.
 */
object LudoPalette {
    val Ivory = Color(0xFFF3E7CB)
    val Rule = Color(0xFFC9B58A)
    val Gold = Color(0xFFD9B04C)
    val GoldDark = Color(0xFF8A6A2A)
    val Ink = Color(0xFF24160C)
    val Walnut = Color(0xFF8B5A2B)
    val WalnutDark = Color(0xFF4A2A12)
    val Cream = Color(0xFFF2ECDF)
    val Tile = Color(0xFFFCFAF5)
    val TileShade = Color(0xFFD8D1C3)

    fun of(color: LudoColor): Color = when (color) {
        LudoColor.RED -> Color(0xFFE23A2E); LudoColor.GREEN -> Color(0xFF23A148); LudoColor.YELLOW -> Color(0xFFF5B913); LudoColor.BLUE -> Color(0xFF1F63D3)
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
                    val cell = boardCellAt(offset, size.width.toFloat(), quarterTurns)
                    val me = state.current
                    val hit = highlight.firstOrNull { t ->
                        val pos = me.tokens[t]
                        val c = LudoBoard.cellOf(me.color, pos) ?: LudoBoard.yardNests(me.color)[t]
                        c == cell
                    }
                    if (hit != null) onTokenTap(hit)
                }
            }
    ) {
        drawLudoBoard(measurer, state, highlight.toSet(), pulse, motion, quarterTurns)
    }
}

private fun frameOf(s: Float): Pair<Float, Float> {
    val cell = s / (LudoBoard.SIZE + 1.1f)
    return cell to cell * 0.55f
}

/** The board cell under a tap, undoing the picture's rotation. */
private fun boardCellAt(offset: Offset, widthPx: Float, turns: Int): Cell {
    val (cell, margin) = frameOf(widthPx)
    val x = (offset.x - margin) / cell
    val y = (offset.y - margin) / cell
    val back = rotateBoard(x, y, 4 - (turns % 4))
    return Cell(back.x.toInt(), back.y.toInt())
}

private fun DrawScope.drawLudoBoard(measurer: TextMeasurer, state: LudoState, highlight: Set<Int>, pulse: Float, motion: MotionFrame, turns: Int) {
    val s = min(size.width, size.height)
    val (cell, margin) = frameOf(s)
    val board = cell * LudoBoard.SIZE
    /** A point in board units to the screen. */
    fun p(x: Float, y: Float): Offset { val r = rotateBoard(x, y, turns); return Offset(margin + r.x * cell, margin + r.y * cell) }
    fun centre(c: Cell) = p(c.col + 0.5f, c.row + 0.5f)
    /** The screen rectangle of a block of cells (rotation keeps it axis-aligned). */
    fun rect(col: Float, row: Float, w: Float, h: Float): Pair<Offset, Size> {
        val a = p(col, row); val b = p(col + w, row + h)
        return Offset(min(a.x, b.x), min(a.y, b.y)) to Size(kotlin.math.abs(a.x - b.x), kotlin.math.abs(a.y - b.y))
    }

    // The royal frame: waxed wood, a gold rim, leaf corners.
    drawRoundRect(Brush.linearGradient(listOf(LudoPalette.Walnut, LudoPalette.WalnutDark, LudoPalette.Walnut), Offset.Zero, Offset(s, s)), Offset.Zero, Size(s, s), CornerRadius(cell * 0.7f))
    drawRoundRect(Color.Black.copy(alpha = 0.25f), Offset(margin * 0.55f, margin * 0.6f), Size(s - margin * 1.1f, s - margin * 1.1f), CornerRadius(cell * 0.4f))
    drawRoundRect(LudoPalette.Gold, Offset(margin * 0.42f, margin * 0.42f), Size(s - margin * 0.84f, s - margin * 0.84f), CornerRadius(cell * 0.45f), style = Stroke(width = cell * 0.07f))
    listOf(Offset(margin * 0.9f, margin * 0.9f), Offset(s - margin * 0.9f, margin * 0.9f), Offset(s - margin * 0.9f, s - margin * 0.9f), Offset(margin * 0.9f, s - margin * 0.9f)).forEach { drawLeafCorner(it, cell) }
    drawRoundRect(LudoPalette.Cream, Offset(margin, margin), Size(board, board), CornerRadius(cell * 0.25f))

    val playing = state.players.map { it.color }.toSet()
    val turnColor = if (state.phase != LudoPhase.OVER) state.current.color else null

    // Yards: a bright rounded square, a white circle, four nests.
    LudoColor.values().forEach { color ->
        val o = LudoBoard.yardOrigin(color)
        val active = color in playing
        val base = if (active) LudoPalette.of(color) else Color(0xFFB9B2A6)
        val (tl, sz) = rect(o.col + 0.22f, o.row + 0.22f, 5.56f, 5.56f)
        drawRoundRect(Color.Black.copy(alpha = 0.18f), tl + Offset(cell * 0.05f, cell * 0.1f), sz, CornerRadius(cell * 0.55f))
        drawRoundRect(Brush.linearGradient(listOf(lerp(base, Color.White, 0.18f), base, lerp(base, Color.Black, 0.12f)), tl, tl + Offset(sz.width, sz.height)), tl, sz, CornerRadius(cell * 0.55f))
        drawRoundRect(Color.White.copy(alpha = 0.55f), tl, sz, CornerRadius(cell * 0.55f), style = Stroke(width = cell * 0.08f))
        // Whose turn it is: the yard itself glows gold.
        if (color == turnColor) {
            drawRoundRect(Color(0xFFFFD54F).copy(alpha = 0.55f + 0.4f * pulse), tl - Offset(cell * 0.1f, cell * 0.1f), Size(sz.width + cell * 0.2f, sz.height + cell * 0.2f), CornerRadius(cell * 0.62f), style = Stroke(width = cell * (0.16f + 0.08f * pulse)))
        }
        val c = p(o.col + 3f, o.row + 3f)
        drawCircle(Color.White.copy(alpha = if (active) 0.62f else 0.4f), radius = cell * 2.25f, center = c)
        drawCircle(lerp(base, Color.White, 0.3f), radius = cell * 2.25f, center = c, style = Stroke(width = cell * 0.06f))
        LudoBoard.yardNests(color).forEach { n -> drawOval(lerp(base, Color.White, 0.25f).copy(alpha = 0.7f), centre(n) + Offset(-cell * 0.38f, cell * 0.12f), Size(cell * 0.76f, cell * 0.34f)) }
    }

    // Track tiles, home columns, starts, stars and arrows.
    fun tile(c: Cell, fill: Color) {
        val (tl, sz) = rect(c.col + 0.06f, c.row + 0.06f, 0.88f, 0.88f)
        drawRoundRect(LudoPalette.TileShade, tl + Offset(0f, cell * 0.06f), sz, CornerRadius(cell * 0.16f))
        drawRoundRect(Brush.verticalGradient(listOf(lerp(fill, Color.White, 0.25f), fill), tl.y, tl.y + sz.height), tl, sz, CornerRadius(cell * 0.16f))
    }
    LudoBoard.TRACK.forEach { tile(it, LudoPalette.Tile) }
    LudoColor.values().forEach { color ->
        val tint = if (color in playing) LudoPalette.of(color) else Color(0xFFC9C2B6)
        LudoBoard.homeColumn(color).forEach { tile(it, tint) }
        val start = LudoBoard.TRACK[color.startIndex]
        tile(start, tint); drawStar(centre(start), cell * 0.3f, Color.White)
        val star = LudoBoard.TRACK[(color.startIndex + 8) % LudoBoard.TRACK_LENGTH]
        tile(star, tint); drawStar(centre(star), cell * 0.3f, Color.White)
        // The arrow on the square before the home column, pointing in.
        val (entry, dir) = when (color) {
            LudoColor.RED -> Cell(0, 7) to Offset(1f, 0f)
            LudoColor.GREEN -> Cell(7, 0) to Offset(0f, 1f)
            LudoColor.YELLOW -> Cell(14, 7) to Offset(-1f, 0f)
            LudoColor.BLUE -> Cell(7, 14) to Offset(0f, -1f)
        }
        tile(entry, LudoPalette.Tile)
        val from = p(entry.col + 0.5f - dir.x * 0.28f, entry.row + 0.5f - dir.y * 0.28f)
        val to = p(entry.col + 0.5f + dir.x * 0.28f, entry.row + 0.5f + dir.y * 0.28f)
        drawArrow(from, to, tint, cell)
    }
    motion.shine?.let { (c, alpha) ->
        drawCircle(Color(0xFFFFE082).copy(alpha = 0.7f * alpha), radius = cell * (0.5f + 0.5f * (1f - alpha)), center = centre(c))
    }

    // Centre: the four triangles, edged in white, a small gold ring where they meet.
    val cx = p(7.5f, 7.5f)
    fun tri(a: Offset, b: Offset, color: LudoColor) {
        val path = Path().apply { moveTo(cx.x, cx.y); lineTo(a.x, a.y); lineTo(b.x, b.y); close() }
        drawPath(path, if (color in playing) LudoPalette.of(color) else Color(0xFFC9C2B6))
        drawPath(path, Color.White.copy(alpha = 0.7f), style = Stroke(width = cell * 0.05f))
    }
    tri(p(6f, 6f), p(6f, 9f), LudoColor.RED)
    tri(p(6f, 6f), p(9f, 6f), LudoColor.GREEN)
    tri(p(9f, 6f), p(9f, 9f), LudoColor.YELLOW)
    tri(p(6f, 9f), p(9f, 9f), LudoColor.BLUE)
    drawCircle(LudoPalette.Gold, radius = cell * 0.22f, center = cx)
    drawCircle(Color.White, radius = cell * 0.22f, center = cx, style = Stroke(width = cell * 0.04f))

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
        val base = centre(c)
        val inYard = pieces.all { state.players[it.player].tokens[it.token] == LudoBoard.YARD }
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

/** A glossy pawn standing with its foot at [foot]: a wide base, a tapering body, a collar and a round head. */
internal fun DrawScope.drawPawn(foot: Offset, height: Float, color: LudoColor, alpha: Float = 1f, shadow: Boolean = true) {
    val base = LudoPalette.of(color)
    val dark = LudoPalette.dark(color)
    val light = LudoPalette.light(color)
    val w = height * 0.62f
    if (shadow) drawOval(Color.Black.copy(alpha = 0.28f * alpha), foot - Offset(w * 0.55f, height * 0.06f), Size(w * 1.1f, height * 0.2f))
    // Base disc.
    drawOval(dark.copy(alpha = alpha), foot - Offset(w * 0.5f, height * 0.13f), Size(w, height * 0.22f))
    drawOval(base.copy(alpha = alpha), foot - Offset(w * 0.48f, height * 0.18f), Size(w * 0.96f, height * 0.2f))
    // Body: a cone from the base up to the neck.
    val neckY = foot.y - height * 0.66f
    val body = Path().apply {
        moveTo(foot.x - w * 0.4f, foot.y - height * 0.1f)
        quadraticTo(foot.x - w * 0.12f, foot.y - height * 0.32f, foot.x - w * 0.14f, neckY)
        lineTo(foot.x + w * 0.14f, neckY)
        quadraticTo(foot.x + w * 0.12f, foot.y - height * 0.32f, foot.x + w * 0.4f, foot.y - height * 0.1f)
        close()
    }
    drawPath(body, Brush.horizontalGradient(listOf(dark, base, light, base, dark), foot.x - w * 0.4f, foot.x + w * 0.4f), alpha = alpha)
    // Collar.
    drawOval(dark.copy(alpha = alpha), Offset(foot.x - w * 0.24f, neckY - height * 0.04f), Size(w * 0.48f, height * 0.09f))
    // Head.
    val head = Offset(foot.x, neckY - height * 0.16f)
    val r = height * 0.2f
    drawCircle(Brush.radialGradient(listOf(Color.White.copy(alpha = 0.9f), light, base, dark), center = head - Offset(r * 0.35f, r * 0.4f), radius = r * 1.5f), radius = r, center = head, alpha = alpha)
}

private fun DrawScope.drawArrow(from: Offset, to: Offset, color: Color, cell: Float) {
    val dx = to.x - from.x; val dy = to.y - from.y
    val len = kotlin.math.sqrt(dx * dx + dy * dy).coerceAtLeast(0.01f)
    val ux = dx / len; val uy = dy / len
    drawLine(color, from, to - Offset(ux * cell * 0.12f, uy * cell * 0.12f), strokeWidth = cell * 0.11f)
    val head = Path().apply {
        moveTo(to.x + ux * cell * 0.06f, to.y + uy * cell * 0.06f)
        lineTo(to.x - ux * cell * 0.2f - uy * cell * 0.16f, to.y - uy * cell * 0.2f + ux * cell * 0.16f)
        lineTo(to.x - ux * cell * 0.2f + uy * cell * 0.16f, to.y - uy * cell * 0.2f - ux * cell * 0.16f)
        close()
    }
    drawPath(head, color)
}

/** A cluster of three green leaves with a gold berry: the royal frame's corner ornament. */
private fun DrawScope.drawLeafCorner(at: Offset, cell: Float) {
    val leaf = Color(0xFF3E7D3A); val leafDark = Color(0xFF24502A)
    listOf(-40f, 0f, 40f).forEach { a ->
        val rad = Math.toRadians(a.toDouble() - 45.0)
        val tip = Offset(at.x + (cell * 0.55f * Math.cos(rad)).toFloat(), at.y + (cell * 0.55f * Math.sin(rad)).toFloat())
        val mid = Offset((at.x + tip.x) / 2f, (at.y + tip.y) / 2f)
        val nx = -(tip.y - at.y) * 0.32f; val ny = (tip.x - at.x) * 0.32f
        val path = Path().apply { moveTo(at.x, at.y); quadraticTo(mid.x + nx, mid.y + ny, tip.x, tip.y); quadraticTo(mid.x - nx, mid.y - ny, at.x, at.y); close() }
        drawPath(path, leaf)
        drawLine(leafDark, at, tip, strokeWidth = cell * 0.03f)
    }
    drawCircle(LudoPalette.Gold, radius = cell * 0.12f, center = at)
}

internal fun DrawScope.drawStar(center: Offset, radius: Float, color: Color) {
    val path = Path()
    for (i in 0 until 10) {
        val r = if (i % 2 == 0) radius else radius * 0.45f
        val a = Math.toRadians((i * 36 - 90).toDouble())
        val pt = Offset(center.x + (r * Math.cos(a)).toFloat(), center.y + (r * Math.sin(a)).toFloat())
        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
    }
    path.close()
    drawPath(path, color)
}
