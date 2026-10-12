package com.rangepatte.app.ui.thumbnails

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
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
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * The Moksha Patam portrait for the Snakes & Ladders tile (stage 1, Design 2): the ivory 10×10
 * board inside a gold vine border, a green serpent with a lotus head winding across it, two creeper
 * ladders with green rungs, and a lotus at the hundredth square — the game's Indian original, in the
 * same ivory-and-gold hand as the other tiles.
 */
@Composable
fun SnakesThumbnail(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) { drawMokshaPatam() }
}

private val Ivory = Color(0xFFF3E7CB)
private val Rule = Color(0xFFC9B58A)
private val Gold = Color(0xFFC9A24B)
private val GoldDark = Color(0xFF8A6A2A)
private val Green = Color(0xFF2E7A4F)
private val GreenDark = Color(0xFF163D27)
private val Crimson = Color(0xFFB8352B)
private val Lotus = Color(0xFFE88AA0)
private val LotusDark = Color(0xFFB8465F)

private fun DrawScope.drawMokshaPatam() {
    val s = min(size.width, size.height)
    val boardSize = s * 0.76f
    val left = (size.width - boardSize) / 2f
    val top = (size.height - boardSize) / 2f
    val cell = boardSize / 10f

    // Vine border: a gold band with leaf beads around the board.
    val band = s * 0.06f
    drawRoundRect(GoldDark, Offset(left - band, top - band), Size(boardSize + band * 2, boardSize + band * 2), CornerRadius(s * 0.03f))
    drawRoundRect(Gold, Offset(left - band, top - band), Size(boardSize + band * 2, boardSize + band * 2), CornerRadius(s * 0.03f), style = Stroke(s * 0.012f))
    val beads = 9
    for (i in 0 until beads) {
        val t = (i + 0.5f) / beads
        val leaf = band * 0.42f
        drawCircle(Green, leaf, Offset(left + boardSize * t, top - band / 2f))
        drawCircle(Green, leaf, Offset(left + boardSize * t, top + boardSize + band / 2f))
        drawCircle(Green, leaf, Offset(left - band / 2f, top + boardSize * t))
        drawCircle(Green, leaf, Offset(left + boardSize + band / 2f, top + boardSize * t))
    }

    // The ivory board and its grid.
    drawRect(Ivory, Offset(left, top), Size(boardSize, boardSize))
    for (i in 0..10) {
        val x = left + cell * i
        val y = top + cell * i
        drawLine(Rule, Offset(x, top), Offset(x, top + boardSize), strokeWidth = s * 0.004f)
        drawLine(Rule, Offset(left, y), Offset(left + boardSize, y), strokeWidth = s * 0.004f)
    }
    // Every other square tinted, the way the boards are printed.
    for (r in 0 until 10) for (c in 0 until 10) if ((r + c) % 2 == 0) {
        drawRect(Rule.copy(alpha = 0.25f), Offset(left + cell * c, top + cell * r), Size(cell, cell))
    }

    // Two creeper ladders: gold rails with green rungs.
    fun ladder(c0: Int, r0: Int, c1: Int, r1: Int) {
        val a = Offset(left + cell * (c0 + 0.5f), top + cell * (r0 + 0.5f))
        val b = Offset(left + cell * (c1 + 0.5f), top + cell * (r1 + 0.5f))
        val dx = b.x - a.x; val dy = b.y - a.y
        val len = kotlin.math.sqrt(dx * dx + dy * dy)
        val nx = -dy / len * cell * 0.22f; val ny = dx / len * cell * 0.22f
        drawLine(GoldDark, Offset(a.x + nx, a.y + ny), Offset(b.x + nx, b.y + ny), strokeWidth = s * 0.014f, cap = StrokeCap.Round)
        drawLine(GoldDark, Offset(a.x - nx, a.y - ny), Offset(b.x - nx, b.y - ny), strokeWidth = s * 0.014f, cap = StrokeCap.Round)
        val rungs = (len / (cell * 0.55f)).toInt().coerceAtLeast(3)
        for (i in 1 until rungs) {
            val t = i.toFloat() / rungs
            val p = Offset(a.x + dx * t, a.y + dy * t)
            drawLine(Green, Offset(p.x + nx, p.y + ny), Offset(p.x - nx, p.y - ny), strokeWidth = s * 0.012f, cap = StrokeCap.Round)
        }
    }
    ladder(1, 9, 2, 4)
    ladder(7, 7, 8, 2)

    // The serpent: a winding body from the top rows down to the bottom, green with a crimson belly line.
    val path = Path()
    val pts = listOf(2.2f to 1.0f, 3.6f to 2.4f, 2.6f to 4.2f, 4.4f to 5.6f, 3.8f to 7.4f, 5.6f to 8.6f).map { (c, r) -> Offset(left + cell * c, top + cell * r) }
    path.moveTo(pts[0].x, pts[0].y)
    for (i in 1 until pts.size) {
        val prev = pts[i - 1]; val next = pts[i]
        val mid = Offset((prev.x + next.x) / 2f, (prev.y + next.y) / 2f)
        path.quadraticTo(prev.x + (if (i % 2 == 0) cell * 0.9f else -cell * 0.9f), mid.y, mid.x, mid.y)
        path.quadraticTo(next.x + (if (i % 2 == 0) -cell * 0.9f else cell * 0.9f), mid.y, next.x, next.y)
    }
    drawPath(path, GreenDark, style = Stroke(s * 0.06f, cap = StrokeCap.Round))
    drawPath(path, Green, style = Stroke(s * 0.042f, cap = StrokeCap.Round))
    drawPath(path, Crimson.copy(alpha = 0.85f), style = Stroke(s * 0.012f, cap = StrokeCap.Round))
    // Tail tip and the lotus head: pink petals around a gold centre, two dark eyes.
    val head = pts[0]
    val petal = cell * 0.46f
    for (k in 0 until 8) {
        val ang = k * (Math.PI / 4).toFloat()
        drawCircle(if (k % 2 == 0) Lotus else LotusDark, petal * 0.5f, Offset(head.x + cos(ang) * petal * 0.7f, head.y + sin(ang) * petal * 0.7f))
    }
    drawCircle(Gold, petal * 0.5f, head)
    drawCircle(GreenDark, petal * 0.12f, Offset(head.x - petal * 0.18f, head.y - petal * 0.1f))
    drawCircle(GreenDark, petal * 0.12f, Offset(head.x + petal * 0.18f, head.y - petal * 0.1f))

    // The hundredth square: a small lotus of liberation at the top-left corner.
    val goal = Offset(left + cell * 0.5f, top + cell * 0.5f)
    for (k in 0 until 6) {
        val ang = k * (Math.PI / 3).toFloat()
        drawCircle(Lotus, cell * 0.16f, Offset(goal.x + cos(ang) * cell * 0.22f, goal.y + sin(ang) * cell * 0.22f))
    }
    drawCircle(Gold, cell * 0.14f, goal)
}
