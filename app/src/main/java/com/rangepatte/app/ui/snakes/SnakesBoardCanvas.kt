package com.rangepatte.app.ui.snakes

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import com.rangepatte.app.domain.snakes.SnakesBoard
import com.rangepatte.app.domain.snakes.SnakesBoard.Breed
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.ui.board.LudoPalette
import com.rangepatte.app.ui.board.drawPawn
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** Where a square sits, in cell units from the board's top-left (row 0 at the top); square 0 waits left of square 1. */
fun squareOffset(square: Int): Offset {
    if (square == SnakesBoard.START) return Offset(-0.5f, SnakesBoard.SIZE - 0.5f)
    val (col, row) = SnakesBoard.cellOf(square)
    return Offset(col + 0.5f, SnakesBoard.SIZE - 1 - row + 0.5f)
}

/**
 * A point along a serpent's body from its head (t = 0) to its tail (t = 1) — the same curve the board
 * draws and a sliding token follows: a gentle bend between the two squares with the body's own
 * side-to-side waves, more of them on a longer serpent.
 */
fun serpentPoint(head: Int, tail: Int, t: Float): Offset {
    val a = squareOffset(head); val b = squareOffset(tail)
    val dx = b.x - a.x; val dy = b.y - a.y
    val len = sqrt(dx * dx + dy * dy).coerceAtLeast(0.01f)
    val nx = -dy / len; val ny = dx / len
    val bend = ((head * 7) % 5 - 2) * 0.28f
    val waves = (len / 1.6f).coerceIn(1.2f, 3.5f)
    val wave = sin(t * waves * 2f * PI.toFloat()) * 0.32f * sin(t * PI.toFloat()).coerceAtLeast(0.25f)
    val side = bend * 4f * t * (1f - t) + wave
    return Offset(a.x + dx * t + nx * side, a.y + dy * t + ny * side)
}

/** One frame of motion (stage 4): the token on the move, drawn at [at] (cell units) instead of its square. */
data class SnakesFrame(val mover: Mover? = null, val faded: Set<Int> = emptySet()) {
    data class Mover(val player: Int, val at: Offset, val lift: Float, val trail: List<Offset>)
    val busy: Boolean get() = mover != null
}

/**
 * The Moksha Patam board: soft pastel squares numbered back and forth on cream, a teal START on 1 and
 * a golden MOKSHA lotus on 100, wooden ladders and nine serpents that each look like their breed —
 * a hooded cobra, a blotched python, a banded krait, a chain-spotted viper and others — lying slanted
 * across the board, all inside the royal court's waxed-wood frame with a gold rim and leaves. The
 * ladders and serpents come from [SnakesBoard], the same tables the rules use.
 */
@Composable
fun SnakesBoardView(state: SnakesState, modifier: Modifier = Modifier, pulse: Float = 1f, motion: SnakesFrame = SnakesFrame()) {
    val measurer = rememberTextMeasurer()
    Canvas(modifier = modifier) { drawSnakesBoard(measurer, state, pulse, motion) }
}

private val Pastels = listOf(Color(0xFFDDE8CC), Color(0xFFF7DDBE), Color(0xFFD3E5EE), Color(0xFFF8F2E3), Color(0xFFF5E6B5), Color(0xFFF3D6CF), Color(0xFFE6E0F0))
private val Number = Color(0xFF3F4A4E)
private val Wood = Color(0xFF9A6233)
private val WoodDark = Color(0xFF5E3816)
private val WoodLight = Color(0xFFC08A55)

private fun DrawScope.drawSnakesBoard(measurer: TextMeasurer, state: SnakesState, pulse: Float, motion: SnakesFrame) {
    // The board may be stretched out of square to fill its room: each square is cellX wide and cellY
    // tall, while round things (pawns, serpents' bodies, text) are sized by the smaller side.
    val w = size.width
    val h = size.height
    val margin = minOf(w, h) / (SnakesBoard.SIZE + 1.3f) * 0.65f
    val cellX = (w - margin * 2) / SnakesBoard.SIZE
    val cellY = (h - margin * 2) / SnakesBoard.SIZE
    val cell = minOf(cellX, cellY)
    val boardSize = Size(cellX * SnakesBoard.SIZE, cellY * SnakesBoard.SIZE)
    fun px(o: Offset) = Offset(margin + o.x * cellX, margin + o.y * cellY)

    // The royal frame.
    drawRoundRect(Brush.linearGradient(listOf(LudoPalette.Walnut, LudoPalette.WalnutDark, LudoPalette.Walnut), Offset.Zero, Offset(w, h)), Offset.Zero, Size(w, h), CornerRadius(cell * 0.5f))
    drawRoundRect(LudoPalette.Gold, Offset(margin * 0.4f, margin * 0.4f), Size(w - margin * 0.8f, h - margin * 0.8f), CornerRadius(cell * 0.35f), style = Stroke(width = cell * 0.06f))
    drawRoundRect(Color(0xFFFAF4E6), Offset(margin, margin), boardSize, CornerRadius(cell * 0.2f))

    // Pastel squares and their numbers.
    val numberStyle = TextStyle(fontSize = (cell * 0.24f / density).sp, fontWeight = FontWeight.SemiBold, color = Number)
    for (sq in 1..SnakesBoard.LAST) {
        val c = squareOffset(sq)
        val tl = px(Offset(c.x - 0.5f, c.y - 0.5f))
        val pastel = Pastels[((sq * 37) xor (sq / 10 * 11)) % Pastels.size]
        drawRect(pastel, tl + Offset(cellX * 0.03f, cellY * 0.03f), Size(cellX * 0.94f, cellY * 0.94f))
        if (sq != 1 && sq != SnakesBoard.LAST) {
            val label = measurer.measure("$sq", numberStyle)
            drawText(label, topLeft = tl + Offset(cell * 0.1f, cell * 0.06f))
        }
    }
    // START on 1: a teal tile; MOKSHA on 100: a golden tile with a lotus.
    run {
        val tl = px(Offset(squareOffset(1).x - 0.5f, squareOffset(1).y - 0.5f))
        drawRoundRect(Brush.verticalGradient(listOf(Color(0xFF1F8A78), Color(0xFF125C50)), tl.y, tl.y + cellY), tl + Offset(cellX * 0.03f, cellY * 0.03f), Size(cellX * 0.94f, cellY * 0.94f), CornerRadius(cell * 0.12f))
        val one = measurer.measure("1", TextStyle(fontSize = (cell * 0.4f / density).sp, fontWeight = FontWeight.Black, color = Color.White))
        drawText(one, topLeft = Offset(tl.x + cellX / 2f - one.size.width / 2f, tl.y + cellY * 0.5f - cell * 0.42f))
        val start = measurer.measure("START", TextStyle(fontSize = (cell * 0.17f / density).sp, fontWeight = FontWeight.Bold, color = Color.White))
        drawText(start, topLeft = Offset(tl.x + cellX / 2f - start.size.width / 2f, tl.y + cellY * 0.5f + cell * 0.12f))
    }
    run {
        val tl = px(Offset(squareOffset(100).x - 0.5f, squareOffset(100).y - 0.5f))
        drawRoundRect(Brush.verticalGradient(listOf(Color(0xFFFFD866), Color(0xFFE09A1A)), tl.y, tl.y + cellY), tl + Offset(cellX * 0.03f, cellY * 0.03f), Size(cellX * 0.94f, cellY * 0.94f), CornerRadius(cell * 0.12f))
        val mid = tl.y + cellY * 0.5f
        drawLotus(Offset(tl.x + cellX / 2f, mid - cell * 0.28f), cell * 0.16f)
        val hundred = measurer.measure("100", TextStyle(fontSize = (cell * 0.27f / density).sp, fontWeight = FontWeight.Black, color = Color(0xFF5A3A08)))
        drawText(hundred, topLeft = Offset(tl.x + cellX / 2f - hundred.size.width / 2f, mid - cell * 0.16f))
        val moksha = measurer.measure("MOKSHA", TextStyle(fontSize = (cell * 0.14f / density).sp, fontWeight = FontWeight.Bold, color = Color(0xFF5A3A08)))
        drawText(moksha, topLeft = Offset(tl.x + cellX / 2f - moksha.size.width / 2f, mid + cell * 0.2f))
    }
    drawRoundRect(LudoPalette.GoldDark, Offset(margin, margin), boardSize, CornerRadius(cell * 0.2f), style = Stroke(cell * 0.05f))
    // Leaves on the frame, as on a painted board: the corners and the middle of each side.
    listOf(Offset(margin * 0.5f, margin * 0.5f), Offset(w - margin * 0.5f, margin * 0.5f), Offset(w - margin * 0.5f, h - margin * 0.5f), Offset(margin * 0.5f, h - margin * 0.5f),
        Offset(w / 2f, margin * 0.5f), Offset(w / 2f, h - margin * 0.5f), Offset(margin * 0.5f, h / 2f), Offset(w - margin * 0.5f, h / 2f)
    ).forEach { drawLeaves(it, cell * 0.28f) }

    // Wooden ladders: two rails with rungs, the light from the top-left.
    SnakesBoard.LADDERS.forEach { (foot, top) ->
        val a = px(squareOffset(foot)); val b = px(squareOffset(top))
        val dx = b.x - a.x; val dy = b.y - a.y
        val len = sqrt(dx * dx + dy * dy)
        val ux = dx / len; val uy = dy / len
        val nx = -uy * cell * 0.19f; val ny = ux * cell * 0.19f
        val a2 = Offset(a.x - ux * cell * 0.25f, a.y - uy * cell * 0.25f); val b2 = Offset(b.x + ux * cell * 0.2f, b.y + uy * cell * 0.2f)
        val rungs = (len / (cell * 0.36f)).toInt().coerceAtLeast(3)
        for (i in 1 until rungs) {
            val t = i.toFloat() / rungs
            val q = Offset(a2.x + (b2.x - a2.x) * t, a2.y + (b2.y - a2.y) * t)
            drawLine(WoodDark, Offset(q.x + nx, q.y + ny + cell * 0.025f), Offset(q.x - nx, q.y - ny + cell * 0.025f), strokeWidth = cell * 0.07f, cap = StrokeCap.Round)
            drawLine(WoodLight, Offset(q.x + nx, q.y + ny), Offset(q.x - nx, q.y - ny), strokeWidth = cell * 0.055f, cap = StrokeCap.Round)
        }
        listOf(1f, -1f).forEach { side ->
            val from = Offset(a2.x + nx * side, a2.y + ny * side); val to = Offset(b2.x + nx * side, b2.y + ny * side)
            drawLine(Color.Black.copy(alpha = 0.18f), from + Offset(cell * 0.04f, cell * 0.06f), to + Offset(cell * 0.04f, cell * 0.06f), strokeWidth = cell * 0.1f, cap = StrokeCap.Round)
            drawLine(WoodDark, from, to, strokeWidth = cell * 0.1f, cap = StrokeCap.Round)
            drawLine(Wood, from, to, strokeWidth = cell * 0.07f, cap = StrokeCap.Round)
            drawLine(WoodLight.copy(alpha = 0.7f), from - Offset(cell * 0.01f, cell * 0.01f), to - Offset(cell * 0.01f, cell * 0.01f), strokeWidth = cell * 0.02f, cap = StrokeCap.Round)
        }
    }

    // Serpents, each drawn as its breed.
    SnakesBoard.SNAKES.forEach { (head, tail) -> drawSerpent(head, tail, SnakesBoard.BREEDS[head] ?: Breed.RAT_SNAKE, cell, ::px) }

    // Tokens: pawns grouped per square, side by side; the current player's glows.
    val bySquare = state.players.withIndex().filter { (i, _) -> motion.mover?.player != i }.groupBy { (_, p) -> p.square }
    bySquare.forEach { (sq, players) ->
        val base = px(squareOffset(sq))
        players.forEachIndexed { i, (seat, p) ->
            val offset = if (players.size == 1) Offset.Zero else Offset((i - (players.size - 1) / 2f) * cell * 0.24f, (i % 2) * cell * 0.08f)
            val foot = base + offset + Offset(0f, cell * 0.32f)
            if (seat == state.turn && state.phase == SnakesPhase.ROLL) {
                drawCircle(Color(0xFFFFD54F).copy(alpha = 0.5f + 0.4f * pulse), radius = cell * (0.46f + 0.06f * pulse), center = foot - Offset(0f, cell * 0.32f), style = Stroke(width = cell * 0.08f))
            }
            drawPawn(foot, cell * 0.78f, p.color, alpha = if (seat in motion.faded) 0.45f else 1f)
        }
    }
    motion.mover?.let { m ->
        val color = state.players[m.player].color
        m.trail.forEachIndexed { i, o -> drawCircle(LudoPalette.of(color).copy(alpha = 0.28f - i * 0.06f), radius = cell * (0.28f - i * 0.04f), center = px(o)) }
        val ground = px(m.at) + Offset(0f, cell * 0.32f)
        drawOval(Color.Black.copy(alpha = 0.25f), ground - Offset(cell * 0.28f, cell * 0.08f), Size(cell * 0.56f, cell * 0.16f))
        drawPawn(ground - Offset(0f, cell * 0.4f * m.lift), cell * (0.78f + 0.12f * m.lift), color, shadow = false)
    }
}

private class BreedLook(val body: Color, val belly: Color, val width: Float, val pattern: (DrawScope.(at: Offset, t: Float, r: Float, dir: Offset, i: Int) -> Unit)?)

private fun look(breed: Breed): BreedLook = when (breed) {
    // Spectacled cobra: olive-brown with pale throat bands.
    Breed.COBRA -> BreedLook(Color(0xFF7A5A2E), Color(0xFFD9C08A), 0.30f) { at, t, r, _, i -> if (i % 7 == 0 && t < 0.35f) drawCircle(Color(0xFFE8D7A8).copy(alpha = 0.8f), r * 0.75f, at) }
    // Indian python: tan with dark brown blotches.
    Breed.PYTHON -> BreedLook(Color(0xFFC9A465), Color(0xFFE7D2A2), 0.34f) { at, _, r, _, i -> if (i % 5 == 0) drawOval(Color(0xFF5B3A1A), at - Offset(r * 0.7f, r * 0.5f), Size(r * 1.4f, r * 1.0f)) }
    // Common krait: glossy black with white bands.
    Breed.KRAIT -> BreedLook(Color(0xFF1C1C22), Color(0xFF3A3A44), 0.22f) { at, _, r, _, i -> if (i % 4 == 0) drawCircle(Color(0xFFF2F2F2), r * 0.92f, at) }
    // Russell's viper: light brown with dark-ringed chain spots.
    Breed.VIPER -> BreedLook(Color(0xFFB58B57), Color(0xFFE6CFA3), 0.28f) { at, _, r, _, i -> if (i % 5 == 0) { drawCircle(Color(0xFF2E1E10), r * 0.62f, at); drawCircle(Color(0xFF8A5A2A), r * 0.42f, at) } }
    // Rat snake: olive-yellow with dark cross-stripes.
    Breed.RAT_SNAKE -> BreedLook(Color(0xFF9C9A3C), Color(0xFFD8D58A), 0.24f) { at, _, r, dir, i -> if (i % 4 == 0) drawLine(Color(0xFF4F4A1A), at + Offset(-dir.y, dir.x) * r, at - Offset(-dir.y, dir.x) * r, strokeWidth = r * 0.4f) }
    // Green vine snake: slender bright green with a yellow flank line.
    Breed.TREE_SNAKE -> BreedLook(Color(0xFF3FB34A), Color(0xFFB8E06A), 0.16f) { at, _, r, _, i -> if (i % 2 == 0) drawCircle(Color(0xFFE8F28A).copy(alpha = 0.7f), r * 0.28f, at + Offset(0f, r * 0.35f)) }
    // Coral snake: red, black and yellow rings.
    Breed.CORAL -> BreedLook(Color(0xFFD23A2A), Color(0xFFE8705E), 0.20f) { at, _, r, _, i -> when (i % 9) { 0, 1 -> drawCircle(Color(0xFF1B1B1B), r * 0.95f, at); 2 -> drawCircle(Color(0xFFF3CF3A), r * 0.95f, at); else -> Unit } }
    // Boa: grey-brown with dark saddles.
    Breed.BOA -> BreedLook(Color(0xFF9E8C76), Color(0xFFD9CBB4), 0.32f) { at, _, r, _, i -> if (i % 6 == 0) drawOval(Color(0xFF6B2E22), at - Offset(r * 0.9f, r * 0.45f), Size(r * 1.8f, r * 0.9f)) }
    // Sea krait: blue-grey with black bands and a paddle tail.
    Breed.SEA_KRAIT -> BreedLook(Color(0xFF7F9FBE), Color(0xFFC9D8E6), 0.24f) { at, _, r, _, i -> if (i % 4 == 0) drawCircle(Color(0xFF1E2430), r * 0.92f, at) }
}

/** One serpent: a tapering body along [serpentPoint], its breed's markings, and its head with eyes and tongue. */
private fun DrawScope.drawSerpent(head: Int, tail: Int, breed: Breed, cell: Float, px: (Offset) -> Offset) {
    val l = look(breed)
    val steps = 70
    val points = (0..steps).map { i -> px(serpentPoint(head, tail, i / steps.toFloat())) }
    fun radius(t: Float) = cell * l.width * (1f - 0.82f * t) * 0.5f + cell * 0.02f
    // Shadow, outline, body and belly, as overlapping discs so the body tapers smoothly.
    points.forEachIndexed { i, pt -> drawCircle(Color.Black.copy(alpha = 0.10f), radius(i / steps.toFloat()) * 1.1f, pt + Offset(cell * 0.05f, cell * 0.07f)) }
    points.forEachIndexed { i, pt -> drawCircle(lerp(l.body, Color.Black, 0.45f), radius(i / steps.toFloat()) * 1.15f, pt) }
    points.forEachIndexed { i, pt -> drawCircle(l.body, radius(i / steps.toFloat()), pt) }
    points.forEachIndexed { i, pt -> drawCircle(l.belly.copy(alpha = 0.35f), radius(i / steps.toFloat()) * 0.45f, pt - Offset(radius(i / steps.toFloat()) * 0.3f, radius(i / steps.toFloat()) * 0.3f)) }
    l.pattern?.let { pattern ->
        points.forEachIndexed { i, pt ->
            if (i < 3) return@forEachIndexed
            val next = points[(i + 1).coerceAtMost(steps)]; val prev = points[i - 1]
            val dx = next.x - prev.x; val dy = next.y - prev.y; val d = sqrt(dx * dx + dy * dy).coerceAtLeast(0.01f)
            pattern(this, pt, i / steps.toFloat(), radius(i / steps.toFloat()), Offset(dx / d, dy / d), i)
        }
    }
    if (breed == Breed.SEA_KRAIT) drawOval(lerp(l.body, Color.Black, 0.3f), points.last() - Offset(cell * 0.08f, cell * 0.12f), Size(cell * 0.16f, cell * 0.24f))
    // The head points away from the body.
    val h = points[0]; val n = points[4]
    val ang = atan2(h.y - n.y, h.x - n.x)
    val dir = Offset(cos(ang), sin(ang)); val side = Offset(-dir.y, dir.x)
    val hw = cell * l.width * 0.62f
    if (breed == Breed.COBRA) {
        // The hood: a broad flare behind the head with the spectacle mark.
        val hood = h - dir * (hw * 0.9f)
        drawOval(lerp(l.body, Color.Black, 0.2f), hood - Offset(hw * 1.25f, hw * 1.25f), Size(hw * 2.5f, hw * 2.5f))
        drawCircle(Color(0xFFE8D7A8), hw * 0.32f, hood + side * (hw * 0.45f), style = Stroke(hw * 0.12f))
        drawCircle(Color(0xFFE8D7A8), hw * 0.32f, hood - side * (hw * 0.45f), style = Stroke(hw * 0.12f))
    }
    val headPath = Path().apply {
        val tip = h + dir * (hw * if (breed == Breed.TREE_SNAKE) 1.5f else 1.05f)
        val wide = if (breed == Breed.VIPER) 1.15f else if (breed == Breed.TREE_SNAKE) 0.65f else 0.85f
        val back = h - dir * (hw * 0.55f)
        moveTo(back.x + side.x * hw * 0.55f, back.y + side.y * hw * 0.55f)
        quadraticTo(h.x + side.x * hw * wide, h.y + side.y * hw * wide, tip.x, tip.y)
        quadraticTo(h.x - side.x * hw * wide, h.y - side.y * hw * wide, back.x - side.x * hw * 0.55f, back.y - side.y * hw * 0.55f)
        close()
    }
    drawPath(headPath, lerp(l.body, Color.Black, 0.12f))
    drawPath(headPath, lerp(l.body, Color.Black, 0.5f), style = Stroke(cell * 0.02f))
    // Eyes and a forked tongue.
    listOf(1f, -1f).forEach { k ->
        val eye = h + dir * (hw * 0.25f) + side * (hw * 0.42f * k)
        drawCircle(Color.White, hw * 0.2f, eye)
        drawCircle(Color.Black, hw * 0.11f, eye + dir * (hw * 0.04f))
    }
    val mouth = h + dir * (hw * 1.05f)
    val fork = mouth + dir * (cell * 0.18f)
    drawLine(Color(0xFFD02A2A), mouth, fork, strokeWidth = cell * 0.025f)
    drawLine(Color(0xFFD02A2A), fork, fork + dir * (cell * 0.07f) + side * (cell * 0.05f), strokeWidth = cell * 0.022f)
    drawLine(Color(0xFFD02A2A), fork, fork + dir * (cell * 0.07f) - side * (cell * 0.05f), strokeWidth = cell * 0.022f)
}

private operator fun Offset.times(k: Float) = Offset(x * k, y * k)

private fun DrawScope.drawLotus(at: Offset, r: Float) {
    for (k in 0 until 7) {
        val ang = (PI.toFloat() * (0.15f + 0.7f * k / 6f))
        val tip = Offset(at.x - cos(ang) * r * 1.6f, at.y - sin(ang) * r * 1.1f)
        val path = Path().apply { moveTo(at.x, at.y + r * 0.5f); quadraticTo(tip.x - r * 0.3f, tip.y, tip.x, tip.y); quadraticTo(tip.x + r * 0.3f, tip.y, at.x, at.y + r * 0.5f); close() }
        drawPath(path, if (k % 2 == 0) Color(0xFFF7A8B8) else Color(0xFFE77E96))
    }
    drawCircle(Color(0xFFFFF3B0), r * 0.3f, at + Offset(0f, r * 0.25f))
}

private fun DrawScope.drawLeaves(at: Offset, r: Float) {
    val leaf = Color(0xFF5E8F4E)
    listOf(-1f, 1f).forEach { k ->
        val tip = at + Offset(r * 1.2f * k, -r * 0.4f)
        val path = Path().apply { moveTo(at.x, at.y); quadraticTo(at.x + r * 0.6f * k, at.y - r * 0.9f, tip.x, tip.y); quadraticTo(at.x + r * 0.6f * k, at.y + r * 0.2f, at.x, at.y); close() }
        drawPath(path, leaf)
    }
    drawCircle(LudoPalette.Gold, r * 0.28f, at)
}
