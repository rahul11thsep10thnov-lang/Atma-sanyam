package com.rangepatte.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/** How thick the carved frame of the table is — game content is inset by this much. */
val TableFrameWidth: Dp = 12.dp

private val TableMargin = 3.dp
private val TableCorner = 20.dp

// Wood and finish tones: dark walnut, a warmer mahogany for the carved frame, and antique brass inlay.
private val Walnut = Color(0xFF633819)
private val WalnutLight = Color(0xFF86522B)
private val WalnutDeep = Color(0xFF3F2310)
private val Mahogany = Color(0xFF6B3B20)
private val MahoganyDeep = Color(0xFF331A0C)
private val GrainDark = Color(0xFF24120A)
private val GrainLight = Color(0xFFB07C45)
private val WaxLight = Color(0xFFFFE7BC)
private val InlayGold = Color(0xFFD9B35A)
private val InlayGoldDark = Color(0xFF8A6428)

/**
 * The playing surface every game sits on: a large antique hardwood table, hand-polished with
 * beeswax. Drawn entirely in code (no bitmaps) so it is crisp at any size and costs nothing to
 * ship, and cached so it is painted once per size, not once per frame.
 *
 * What it is made of, back to front: warm walnut with long irregular grain and a few cathedral
 * figures; a soft slanting wax sheen and a lamp-glow highlight; darkened edges; a thick raised
 * frame in mahogany with a bevelled outer edge, a brass inlay line and a carved groove with brass studs; a shadowed lip
 * where the frame meets the field; and delicate carved corner flourishes. The middle of the field is
 * left plain so cards and plaques stay easy to read.
 *
 * [content] is laid out inside the frame (inset by [TableFrameWidth]).
 */
@Composable
fun AntiqueWoodTable(
    modifier: Modifier = Modifier,
    seed: Int = 11,
    content: @Composable BoxScope.() -> Unit = {}
) {
    Box(
        modifier = modifier
            .padding(TableMargin)
            .shadow(elevation = 8.dp, shape = RoundedCornerShape(TableCorner))
            .drawWithCache {
                val frame = TableFrameWidth.toPx()
                val outer = TableCorner.toPx()
                val table = TableArt(size, frame, outer, density, seed)
                onDrawBehind { table.draw(this) }
            }
            .padding(TableFrameWidth),
        content = content
    )
}

private class TableArt(
    private val size: Size,
    private val frame: Float,
    private val outerRadius: Float,
    private val density: Float,
    private val seed: Int
) {
    private val dp = density
    private val bounds = Rect(Offset.Zero, size)
    private val field = Rect(frame, frame, size.width - frame, size.height - frame)
    private val fieldRadius = (outerRadius - frame * 0.5f).coerceAtLeast(frame * 0.4f)
    private val outerShape = RoundRect(bounds, CornerRadius(outerRadius))
    private val fieldShape = RoundRect(field, CornerRadius(fieldRadius))
    private val fieldPath = Path().apply { addRoundRect(fieldShape) }

    // Pre-built so drawing is just a handful of cheap calls.
    private val grain: Path
    private val grainLight: Path
    private val arches: Path
    private val groove: Path
    private val frameGrain: Path
    private val studs = ArrayList<Offset>()

    init {
        val random = Random(seed)
        grain = Path()
        grainLight = Path()
        val lines = 70
        repeat(lines) { i ->
            val target = if (i % 4 == 0) grainLight else grain
            val x0 = field.left + random.nextFloat() * field.width
            target.moveTo(x0, field.top - 4f)
            var x = x0
            var y = field.top
            val drift = (random.nextFloat() - 0.5f) * field.width * 0.05f
            val segments = 5
            for (s in 0 until segments) {
                val dy = field.height / segments
                val wobble = (random.nextFloat() - 0.5f) * field.width * 0.03f
                target.cubicTo(
                    x + wobble, y + dy * 0.35f,
                    x + drift + wobble * -0.6f, y + dy * 0.7f,
                    x + drift, y + dy
                )
                x += drift
                y += dy
            }
        }
        arches = Path()
        repeat(3) { n ->
            val cx = field.left + field.width * (0.2f + 0.3f * n + random.nextFloat() * 0.12f)
            val cy = field.top + field.height * (0.25f + random.nextFloat() * 0.5f)
            val legs = field.height * 0.35f
            for (k in 1..6) {
                val rx = (3.5f + k * 4.2f) * dp
                val ry = (6f + k * 9f) * dp
                arches.moveTo(cx - rx, cy + legs)
                arches.lineTo(cx - rx, cy)
                arches.arcTo(Rect(cx - rx, cy - ry, cx + rx, cy + ry), 180f, 180f, false)
                arches.lineTo(cx + rx, cy + legs)
            }
        }

        // Round the middle of the frame runs a fine carved groove with a stud (a small carved rosette)
        // at regular intervals — calm and symmetrical, nothing busy.
        fun track(inset: Float) = Path().apply {
            addRoundRect(
                RoundRect(
                    Rect(frame * inset, frame * inset, size.width - frame * inset, size.height - frame * inset),
                    CornerRadius((outerRadius - frame * inset).coerceAtLeast(2f))
                )
            )
        }
        groove = track(0.5f)
        frameGrain = Path().apply {
            addPath(track(0.34f)); addPath(track(0.66f)); addPath(track(0.82f))
        }
        val measure = PathMeasure().apply { setPath(groove, false) }
        val length = measure.length
        val count = (length / (frame * 2.6f)).toInt().coerceAtLeast(8)
        for (i in 0 until count) studs += measure.getPosition(length * (i + 0.5f) / count)
    }

    fun draw(scope: DrawScope) = with(scope) {
        drawFrame()
        clipPath(fieldPath) {
            drawField()
        }
        drawLip()
        drawCorners()
    }

    // ---- The raised mahogany frame -------------------------------------------------------------

    private fun DrawScope.drawFrame() {
        drawRoundRect(
            brush = Brush.linearGradient(
                0f to Color(0xFF8A5530),
                0.45f to Mahogany,
                1f to MahoganyDeep,
                start = Offset.Zero,
                end = Offset(size.width, size.height)
            ),
            cornerRadius = CornerRadius(outerRadius)
        )
        // Bevel: lit from the top-left, shaded bottom-right.
        drawRoundRect(
            brush = Brush.linearGradient(
                0f to Color(0x99FFE2B0), 0.5f to Color(0x00FFE2B0), 0.5f to Color(0x00000000), 1f to Color(0xAA000000),
                start = Offset.Zero, end = Offset(size.width, size.height)
            ),
            cornerRadius = CornerRadius(outerRadius),
            style = Stroke(width = 1.6f * dp)
        )
        // Brass inlay line.
        val inlay = frame * 0.2f
        drawRoundRect(
            brush = Brush.linearGradient(listOf(InlayGold, InlayGoldDark, InlayGold), start = Offset.Zero, end = Offset(size.width, size.height)),
            topLeft = Offset(inlay, inlay),
            size = Size(size.width - inlay * 2, size.height - inlay * 2),
            cornerRadius = CornerRadius(outerRadius - inlay),
            style = Stroke(width = 1.1f * dp)
        )
        // Faint grain following the frame, then the carved groove: a shadow offset under a lighter line
        // gives the cut-into-wood look.
        drawPath(frameGrain, Color.Black.copy(alpha = 0.18f), style = Stroke(0.7f * dp))
        withTransform({ translate(0.7f * dp, 0.8f * dp) }) {
            drawPath(groove, Color.Black.copy(alpha = 0.5f), style = Stroke(1.0f * dp))
        }
        drawPath(groove, InlayGold.copy(alpha = 0.45f), style = Stroke(0.8f * dp))
        val stud = frame * 0.19f
        studs.forEach { c ->
            drawCircle(Color.Black.copy(alpha = 0.55f), stud * 1.25f, c + Offset(0.6f * dp, 0.7f * dp))
            drawCircle(Brush.radialGradient(listOf(Color(0xFFF2D58A), InlayGoldDark), center = c - Offset(stud * 0.3f, stud * 0.3f), radius = stud * 1.6f), stud, c)
            drawCircle(InlayGoldDark.copy(alpha = 0.7f), stud, c, style = Stroke(0.5f * dp))
        }
    }

    // ---- The waxed playing field -----------------------------------------------------------------

    private fun DrawScope.drawField() {
        drawRect(
            brush = Brush.verticalGradient(
                0f to WalnutLight, 0.45f to Walnut, 1f to WalnutDeep,
                startY = field.top, endY = field.bottom
            ),
            topLeft = field.topLeft,
            size = field.size
        )
        // Grain: long dark lines, a few lighter ones, and cathedral arches.
        drawPath(grain, color = GrainDark.copy(alpha = 0.26f), style = Stroke(1.3f * dp))
        drawPath(grain, color = GrainDark.copy(alpha = 0.10f), style = Stroke(3.2f * dp))
        drawPath(grainLight, color = GrainLight.copy(alpha = 0.2f), style = Stroke(1.6f * dp))
        drawPath(arches, color = GrainDark.copy(alpha = 0.10f), style = Stroke(1.1f * dp))
        drawPath(arches, color = GrainLight.copy(alpha = 0.06f), style = Stroke(2.6f * dp))

        // Wax: a soft slanting sheen and a warm lamp-light glow high on the table, never a mirror.
        drawRect(
            brush = Brush.linearGradient(
                0f to Color.Transparent, 0.38f to Color.Transparent,
                0.5f to WaxLight.copy(alpha = 0.13f),
                0.62f to Color.Transparent, 1f to Color.Transparent,
                start = Offset(field.left, field.top + field.height * 0.1f),
                end = Offset(field.right, field.top + field.height * 0.75f)
            ),
            topLeft = field.topLeft, size = field.size
        )
        drawRect(
            brush = Brush.radialGradient(
                colors = listOf(WaxLight.copy(alpha = 0.20f), Color.Transparent),
                center = Offset(field.left + field.width * 0.32f, field.top + field.height * 0.16f),
                radius = field.width * 0.75f
            ),
            topLeft = field.topLeft, size = field.size
        )
        // A few short bright streaks along the grain, where the wax catches the light.
        val glint = Random(seed + 5)
        repeat(7) {
            val x = field.left + glint.nextFloat() * field.width
            val y = field.top + glint.nextFloat() * field.height * 0.7f
            val len = (28f + glint.nextFloat() * 70f) * dp
            drawLine(
                color = WaxLight.copy(alpha = 0.06f + glint.nextFloat() * 0.05f),
                start = Offset(x, y), end = Offset(x + (glint.nextFloat() - 0.5f) * 6f * dp, y + len),
                strokeWidth = (1.5f + glint.nextFloat() * 2f) * dp, cap = StrokeCap.Round
            )
        }
        // Edges of the field are darker, as an old table is where hands and light rarely reach.
        drawRect(
            brush = Brush.radialGradient(
                0.55f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.5f),
                center = field.center, radius = maxOf(field.width, field.height) * 0.72f
            ),
            topLeft = field.topLeft, size = field.size
        )
    }

    // ---- Where the frame meets the field ------------------------------------------------------------

    private fun DrawScope.drawLip() {
        // Shadow cast by the raised frame onto the table.
        clipPath(fieldPath) {
            drawRoundRect(
                color = Color.Black.copy(alpha = 0.55f),
                topLeft = field.topLeft, size = field.size, cornerRadius = CornerRadius(fieldRadius),
                style = Stroke(width = 5f * dp)
            )
            drawRoundRect(
                color = Color.Black.copy(alpha = 0.25f),
                topLeft = field.topLeft, size = field.size, cornerRadius = CornerRadius(fieldRadius),
                style = Stroke(width = 11f * dp)
            )
        }
        // A fine gold inlay just inside the lip.
        val gap = 4.5f * dp
        drawRoundRect(
            color = InlayGold.copy(alpha = 0.5f),
            topLeft = Offset(field.left + gap, field.top + gap),
            size = Size(field.width - gap * 2, field.height - gap * 2),
            cornerRadius = CornerRadius((fieldRadius - gap).coerceAtLeast(2f)),
            style = Stroke(width = 0.9f * dp)
        )
        // The rim of the frame catches a thin highlight.
        drawRoundRect(
            color = WaxLight.copy(alpha = 0.22f),
            topLeft = field.topLeft, size = field.size, cornerRadius = CornerRadius(fieldRadius),
            style = Stroke(width = 0.8f * dp)
        )
    }

    // ---- Carved corner flourishes --------------------------------------------------------------------

    private fun DrawScope.drawCorners() {
        val reach = minOf(field.width, field.height) * 0.2f
        val inset = 9f * dp
        val corners = listOf(
            Triple(Offset(field.left + inset, field.top + inset), 1f, 1f),
            Triple(Offset(field.right - inset, field.top + inset), -1f, 1f),
            Triple(Offset(field.left + inset, field.bottom - inset), 1f, -1f),
            Triple(Offset(field.right - inset, field.bottom - inset), -1f, -1f)
        )
        corners.forEach { (origin, sx, sy) ->
            withTransform({
                translate(origin.x, origin.y)
                scale(sx, sy, pivot = Offset.Zero)
            }) {
                carvedCorner(reach.coerceIn(36f * dp, 74f * dp))
            }
        }
    }

    /** One corner's flower with two short leafy vines, drawn from the corner outwards. */
    private fun DrawScope.carvedCorner(reach: Float) {
        val lineW = 1.0f * dp
        fun carve(draw: DrawScope.(Color) -> Unit) {
            withTransform({ translate(0.7f * dp, 0.8f * dp) }) { draw(Color.Black.copy(alpha = 0.5f)) }
            draw(InlayGold.copy(alpha = 0.58f))
        }
        val flowerCenter = Offset(reach * 0.2f, reach * 0.2f)
        val petalLen = reach * 0.17f
        carve { color ->
            for (i in 0 until 6) {
                val a = (PI / 3 * i).toFloat()
                val tip = Offset(flowerCenter.x + cos(a) * petalLen, flowerCenter.y + sin(a) * petalLen)
                val l = Offset(flowerCenter.x + cos(a - 0.5f) * petalLen * 0.6f, flowerCenter.y + sin(a - 0.5f) * petalLen * 0.6f)
                val r = Offset(flowerCenter.x + cos(a + 0.5f) * petalLen * 0.6f, flowerCenter.y + sin(a + 0.5f) * petalLen * 0.6f)
                val petal = Path().apply {
                    moveTo(flowerCenter.x, flowerCenter.y)
                    quadraticTo(l.x, l.y, tip.x, tip.y)
                    quadraticTo(r.x, r.y, flowerCenter.x, flowerCenter.y)
                }
                drawPath(petal, color = color, style = Stroke(lineW))
            }
            drawCircle(color, radius = petalLen * 0.2f, center = flowerCenter)
            // Two vines, one along each edge, each with alternating leaves.
            for (axis in 0..1) {
                val vine = Path()
                val steps = 18
                for (s in 0..steps) {
                    val u = s / steps.toFloat()
                    val along = reach * (0.34f + 0.66f * u)
                    val across = reach * 0.2f + sin(u * PI.toFloat() * 3f) * reach * 0.035f
                    val p = if (axis == 0) Offset(along, across) else Offset(across, along)
                    if (s == 0) vine.moveTo(p.x, p.y) else vine.lineTo(p.x, p.y)
                }
                drawPath(vine, color = color, style = Stroke(lineW, cap = StrokeCap.Round))
                for (k in 0 until 3) {
                    val u = 0.18f + k * 0.3f
                    val along = reach * (0.34f + 0.66f * u)
                    val across = reach * 0.2f
                    val side = if (k % 2 == 0) 1f else -1f
                    val base = if (axis == 0) Offset(along, across) else Offset(across, along)
                    val leafLen = reach * 0.11f
                    val tip = if (axis == 0) Offset(base.x + leafLen * 0.6f, base.y + side * leafLen) else Offset(base.x + side * leafLen, base.y + leafLen * 0.6f)
                    val c1 = if (axis == 0) Offset(base.x - leafLen * 0.1f, base.y + side * leafLen * 0.8f) else Offset(base.x + side * leafLen * 0.8f, base.y - leafLen * 0.1f)
                    val c2 = if (axis == 0) Offset(base.x + leafLen * 0.8f, base.y + side * leafLen * 0.3f) else Offset(base.x + side * leafLen * 0.3f, base.y + leafLen * 0.8f)
                    val leaf = Path().apply {
                        moveTo(base.x, base.y)
                        quadraticTo(c1.x, c1.y, tip.x, tip.y)
                        quadraticTo(c2.x, c2.y, base.x, base.y)
                    }
                    drawPath(leaf, color = color.copy(alpha = color.alpha * 0.85f))
                }
            }
        }
    }
}
