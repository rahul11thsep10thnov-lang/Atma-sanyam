package com.rangepatte.app.ui.board

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.audio.DieTiming
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** A point or direction in the die's 3D space (x right, y up, z towards the viewer). */
data class V3(val x: Float, val y: Float, val z: Float) {
    operator fun plus(o: V3) = V3(x + o.x, y + o.y, z + o.z)
    operator fun minus(o: V3) = V3(x - o.x, y - o.y, z - o.z)
    operator fun times(k: Float) = V3(x * k, y * k, z * k)
    fun dot(o: V3) = x * o.x + y * o.y + z * o.z
}

/** A 3×3 rotation, row-major. */
class M3(private val m: FloatArray) {
    operator fun times(o: M3): M3 {
        val r = FloatArray(9)
        for (i in 0..2) for (j in 0..2) r[i * 3 + j] = (0..2).sumOf { k -> (m[i * 3 + k] * o.m[k * 3 + j]).toDouble() }.toFloat()
        return M3(r)
    }
    operator fun times(v: V3) = V3(m[0] * v.x + m[1] * v.y + m[2] * v.z, m[3] * v.x + m[4] * v.y + m[5] * v.z, m[6] * v.x + m[7] * v.y + m[8] * v.z)

    companion object {
        val I = M3(floatArrayOf(1f, 0f, 0f, 0f, 1f, 0f, 0f, 0f, 1f))
        fun rx(deg: Float): M3 { val a = deg * PI.toFloat() / 180f; val c = cos(a); val s = sin(a); return M3(floatArrayOf(1f, 0f, 0f, 0f, c, -s, 0f, s, c)) }
        fun ry(deg: Float): M3 { val a = deg * PI.toFloat() / 180f; val c = cos(a); val s = sin(a); return M3(floatArrayOf(c, 0f, s, 0f, 1f, 0f, -s, 0f, c)) }
        fun rz(deg: Float): M3 { val a = deg * PI.toFloat() / 180f; val c = cos(a); val s = sin(a); return M3(floatArrayOf(c, -s, 0f, s, c, 0f, 0f, 0f, 1f)) }
    }
}

/**
 * The die's geometry (stage 4 of the dice brief): a cube of half-size 1 whose faces carry the standard
 * values with opposite faces summing to seven — 1 front / 6 back, 2 top / 5 bottom, 3 right / 4 left.
 * Pure, so the layout is tested on the JVM.
 */
object DieModel {
    /** A face: its value, outward normal and the two in-plane axes the pips are laid out along. */
    data class Face(val value: Int, val n: V3, val u: V3, val v: V3)

    val FACES = listOf(
        Face(1, V3(0f, 0f, 1f), V3(1f, 0f, 0f), V3(0f, 1f, 0f)),
        Face(6, V3(0f, 0f, -1f), V3(-1f, 0f, 0f), V3(0f, 1f, 0f)),
        Face(2, V3(0f, 1f, 0f), V3(1f, 0f, 0f), V3(0f, 0f, -1f)),
        Face(5, V3(0f, -1f, 0f), V3(1f, 0f, 0f), V3(0f, 0f, 1f)),
        Face(3, V3(1f, 0f, 0f), V3(0f, 0f, -1f), V3(0f, 1f, 0f)),
        Face(4, V3(-1f, 0f, 0f), V3(0f, 0f, 1f), V3(0f, 1f, 0f))
    )

    /** Pip centres for each value, in face coordinates (-1..1). */
    fun pips(value: Int): List<Pair<Float, Float>> {
        val c = 0f to 0f
        val tl = -0.5f to 0.5f; val tr = 0.5f to 0.5f; val bl = -0.5f to -0.5f; val br = 0.5f to -0.5f
        val ml = -0.5f to 0f; val mr = 0.5f to 0f
        return when (value) {
            1 -> listOf(c)
            2 -> listOf(tl, br)
            3 -> listOf(tl, c, br)
            4 -> listOf(tl, tr, bl, br)
            5 -> listOf(tl, tr, c, bl, br)
            else -> listOf(tl, tr, ml, mr, bl, br)
        }
    }

    /** The rotation that brings [value]'s face to the front. */
    fun faceFront(value: Int): M3 = when (value) {
        1 -> M3.I
        6 -> M3.ry(180f)
        2 -> M3.rx(90f)
        5 -> M3.rx(-90f)
        3 -> M3.ry(-90f)
        else -> M3.ry(90f)
    }

    /** The resting tilt that lets the viewer see the top and right faces as well, like a die on a table. */
    val VIEW: M3 = M3.rx(30f) * M3.ry(-32f)

    /** The value whose face points most towards the viewer under [r] (the one a player reads). */
    fun frontValue(r: M3): Int = FACES.maxByOrNull { (r * it.n).z }!!.value
}

/**
 * Where the die is at [elapsedMs] of a throw that ends showing [value] (toss → tumble → bounce →
 * settle, on the [DieTiming] timeline). The result is decided before the throw; this only animates
 * towards it, ending exactly on [DieModel.VIEW] × [DieModel.faceFront]. [seed] varies the tumble.
 */
data class DiePose(val rotation: M3, val lift: Float, val squash: Float, val driftX: Float) {
    companion object {
        fun at(value: Int, elapsedMs: Float, seed: Int): DiePose {
            val total = DieTiming.TOTAL_MS.toFloat()
            val t = (elapsedMs / total).coerceIn(0f, 1f)
            val rest = DieModel.VIEW * DieModel.faceFront(value)
            if (t >= 1f) return DiePose(rest, 0f, 1f, 0f)
            // Spin that unwinds to zero: whole turns plus a seeded extra, eased out so it slows as it settles.
            val unwind = 1f - (1f - (1f - t) * (1f - t) * (1f - t))
            val sx = (720f + (seed % 7) * 45f) * unwind
            val sy = (540f + (seed % 5) * 60f) * unwind
            val sz = (180f + (seed % 3) * 90f) * unwind
            val rotation = DieModel.VIEW * M3.rx(sx) * M3.ry(sy) * M3.rz(sz) * DieModel.faceFront(value)
            // Height: up in the toss, down to the first impact, then two shrinking bounces, then still.
            val impacts = DieTiming.IMPACTS.map { it.first.toFloat() }
            val ms = elapsedMs
            val lift = when {
                ms < 250f -> sin((ms / 250f) * PI.toFloat() / 2f)
                ms < impacts[0] -> { val f = (ms - 250f) / (impacts[0] - 250f); 1f - f * f }
                ms < impacts[1] -> { val f = (ms - impacts[0]) / (impacts[1] - impacts[0]); 0.32f * 4f * f * (1f - f) }
                ms < impacts[2] -> { val f = (ms - impacts[1]) / (impacts[2] - impacts[1]); 0.12f * 4f * f * (1f - f) }
                else -> 0f
            }
            // A brief squash at each impact.
            val squash = 1f - impacts.zip(listOf(0.12f, 0.06f, 0.03f)).sumOf { (at, k) -> val d = abs(ms - at); if (d < 60f) (k * (1f - d / 60f)).toDouble() else 0.0 }.toFloat()
            val driftX = (1f - t) * (1f - t) * -0.35f
            return DiePose(rotation, lift, squash, driftX)
        }
    }
}

/**
 * The die (dice brief): a rounded ivory-white cube with black pips, drawn in light 3D on a green
 * pedestal with a gold rim. It shows [frame]'s throw if one is running, else rests on [value]. Glows
 * gold when it is this player's roll; tapping it rolls when [onClick] is set.
 */
@Composable
fun Die(value: Int?, highlight: Boolean, modifier: Modifier = Modifier, frame: DieFrame? = null, size: Dp = 68.dp, onClick: (() -> Unit)? = null) {
    val shown = frame?.face ?: value
    val label = if (shown != null) "Die: $shown" else "Die"
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(size)
            .semantics { contentDescription = label }
            .then(if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier)
    ) {
        Canvas(modifier = Modifier.size(size)) {
            drawPedestal(highlight, frame?.sixFlash ?: 0f)
            if (shown == null) {
                drawDie(DiePose(DieModel.VIEW * DieModel.faceFront(1), 0f, 1f, 0f), blank = true)
            } else {
                val pose = if (frame != null && frame.rolling) DiePose.at(shown, frame.elapsedMs, frame.seed) else DiePose.at(shown, DieTiming.TOTAL_MS.toFloat(), 0)
                drawDie(pose, blank = false)
            }
        }
    }
}

private val PedestalGreen = Color(0xFF2E9E4A)
private val PedestalDark = Color(0xFF1D6A31)
private val Gold = Color(0xFFD9B04C)
private val GoldDark = Color(0xFF8A6A2A)
private val Ivory = Color(0xFFFBF8F1)
private val Pip = Color(0xFF151515)

private fun DrawScope.drawPedestal(highlight: Boolean, sixFlash: Float) {
    val w = size.width
    val c = Offset(w / 2f, w * 0.78f)
    val rx = w * 0.46f; val ry = w * 0.17f
    if (highlight || sixFlash > 0f) {
        drawOval(Color(0xFFF5C542).copy(alpha = 0.35f + 0.4f * sixFlash), Offset(c.x - rx * 1.12f, c.y - ry * 1.3f), Size(rx * 2.24f, ry * 2.6f))
    }
    drawOval(GoldDark, Offset(c.x - rx, c.y - ry + w * 0.03f), Size(rx * 2, ry * 2))
    drawOval(Brush.verticalGradient(listOf(Gold, GoldDark), startY = c.y - ry, endY = c.y + ry), Offset(c.x - rx, c.y - ry), Size(rx * 2, ry * 2))
    drawOval(Brush.radialGradient(listOf(PedestalGreen, PedestalDark), center = c, radius = rx), Offset(c.x - rx * 0.86f, c.y - ry * 0.8f), Size(rx * 1.72f, ry * 1.6f))
}

/** Convex hull of 2D points (monotone chain), counter-clockwise. */
private fun hull(points: List<Offset>): List<Offset> {
    val p = points.sortedWith(compareBy<Offset> { it.x }.thenBy { it.y })
    if (p.size < 3) return p
    fun cross(o: Offset, a: Offset, b: Offset) = (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
    val lower = ArrayList<Offset>(); val upper = ArrayList<Offset>()
    for (pt in p) { while (lower.size >= 2 && cross(lower[lower.size - 2], lower.last(), pt) <= 0) lower.removeAt(lower.size - 1); lower.add(pt) }
    for (pt in p.asReversed()) { while (upper.size >= 2 && cross(upper[upper.size - 2], upper.last(), pt) <= 0) upper.removeAt(upper.size - 1); upper.add(pt) }
    return lower.dropLast(1) + upper.dropLast(1)
}

/**
 * Projects and draws the die: a rounded silhouette (the convex outline of the cube, drawn with round
 * joins) in a slightly darker ivory that reads as the bevelled edges, then each visible face a little
 * inset and shaded by the light, with its pips. A soft shadow below shrinks as the die rises.
 */
private fun DrawScope.drawDie(pose: DiePose, blank: Boolean) {
    val w = size.width
    val half = w * 0.21f
    val ground = w * 0.66f
    val centre = Offset(w / 2f + pose.driftX * w, ground - half * 1.1f - pose.lift * w * 0.32f)
    val shadow = 1f - pose.lift * 0.5f
    drawOval(Color.Black.copy(alpha = 0.32f * shadow), Offset(w / 2f + pose.driftX * w - half * 1.2f * shadow, ground + w * 0.04f), Size(half * 2.4f * shadow, half * 0.7f * shadow))
    val light = V3(-0.45f, 0.75f, 0.55f).let { val l = sqrt(it.dot(it)); it * (1f / l) }
    val focal = 7f
    fun project(p: V3): Offset {
        val r = pose.rotation * p
        val k = focal / (focal - r.z)
        return Offset(centre.x + r.x * half * k, centre.y - r.y * half * k * pose.squash)
    }
    // The rounded body: every cube corner projected, outlined with round joins.
    val cubeCorners = listOf(-1f, 1f).flatMap { x -> listOf(-1f, 1f).flatMap { y -> listOf(-1f, 1f).map { z -> project(V3(x, y, z)) } } }
    val outline = hull(cubeCorners)
    val body = Path().apply { moveTo(outline[0].x, outline[0].y); outline.drop(1).forEach { lineTo(it.x, it.y) }; close() }
    drawPath(body, Color(0xFFD9D2C3))
    drawPath(body, Color(0xFFD9D2C3), style = Stroke(width = half * 0.22f, join = StrokeJoin.Round))
    drawPath(body, Color.Black.copy(alpha = 0.18f), style = Stroke(width = half * 0.03f, join = StrokeJoin.Round))
    val inset = 0.84f
    val visible = DieModel.FACES.map { it to (pose.rotation * it.n) }.filter { it.second.z > 0.03f }.sortedBy { it.second.z }
    visible.forEach { (face, n) ->
        val corners = listOf(-1f to -1f, 1f to -1f, 1f to 1f, -1f to 1f).map { (a, b) -> project(face.n + face.u * (a * inset) + face.v * (b * inset)) }
        val path = Path().apply { moveTo(corners[0].x, corners[0].y); corners.drop(1).forEach { lineTo(it.x, it.y) }; close() }
        val shade = 0.80f + 0.20f * n.dot(light).coerceIn(0f, 1f)
        val faceColour = Color(Ivory.red * shade, Ivory.green * shade, Ivory.blue * shade * 0.985f, 1f)
        drawPath(path, faceColour)
        drawPath(path, faceColour, style = Stroke(width = half * 0.14f, join = StrokeJoin.Round))
        if (!blank) {
            DieModel.pips(face.value).forEach { (pu, pv) ->
                val centre3 = face.n * 1.001f + face.u * (pu * 1.05f) + face.v * (pv * 1.05f)
                val r = 0.17f
                val ring = (0 until 16).map { i ->
                    val a = i * 2f * PI.toFloat() / 16f
                    project(centre3 + face.u * (cos(a) * r) + face.v * (sin(a) * r))
                }
                val pip = Path().apply { moveTo(ring[0].x, ring[0].y); ring.drop(1).forEach { lineTo(it.x, it.y) }; close() }
                drawPath(pip, Pip.copy(alpha = 0.45f + 0.55f * n.z))
            }
        }
    }
}
