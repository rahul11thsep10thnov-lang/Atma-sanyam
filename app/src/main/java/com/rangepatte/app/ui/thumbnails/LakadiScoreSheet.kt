package com.rangepatte.app.ui.thumbnails

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.rangepatte.app.ui.theme.CardInkRed
import com.rangepatte.app.ui.theme.ParchmentCream
import com.rangepatte.app.ui.theme.ParchmentSurfaceDim

private val players = listOf("Ravi", "Asha", "Gopal", "Meera")

/**
 * Four games of Lakadi. Making a bid scores the tricks bid, each extra trick adds 0.1, and falling
 * short loses the bid — hence the decimals and the negatives.
 */
private val gameScores = listOf(
    listOf("3", "2.1", "-4", "5"),
    listOf("-2", "4", "3.2", "1"),
    listOf("6", "-3", "2", "2.1"),
    listOf("2.2", "3", "-5", "4")
)
private val totals = listOf("9.2", "6.1", "-3.8", "12.1")

private val pencil = Color(0xFF3B3226)
private val ruling = Color(0xFF8A7458)

/** A slightly tilted sheet of paper with a hand-written Lakadi score table on it. */
internal fun DrawScope.drawLakadiScoreSheet(textMeasurer: TextMeasurer) {
    val paperSize = Size(size.width * 0.86f, size.height * 0.84f)
    val paperTopLeft = Offset((size.width - paperSize.width) / 2f, (size.height - paperSize.height) / 2f)

    rotate(degrees = -4f, pivot = center) {
        drawRect(Color.Black.copy(alpha = 0.35f), paperTopLeft + Offset(paperSize.width * 0.02f, paperSize.height * 0.025f), paperSize)
        drawRoundRect(
            brush = Brush.verticalGradient(
                listOf(ParchmentCream, ParchmentSurfaceDim),
                startY = paperTopLeft.y,
                endY = paperTopLeft.y + paperSize.height
            ),
            topLeft = paperTopLeft,
            size = paperSize,
            cornerRadius = CornerRadius(paperSize.width * 0.015f)
        )

        // Title row, header row (names), four game rows, then the total row.
        val rows = 7
        val rowHeight = paperSize.height / (rows + 0.4f)
        val tableTop = paperTopLeft.y + rowHeight * 0.2f
        val labelWidth = paperSize.width * 0.12f
        val columnWidth = (paperSize.width - labelWidth) / players.size
        val fontPx = rowHeight * 0.58f
        val lineWidth = paperSize.width * 0.006f

        fun rowTop(row: Int) = tableTop + row * rowHeight
        fun columnCenter(column: Int) = paperTopLeft.x + labelWidth + columnWidth * (column + 0.5f)

        fun write(text: String, centerX: Float, row: Int, maxWidth: Float, color: Color = pencil, bold: Boolean = false) {
            var style = TextStyle(
                color = color,
                fontSize = fontPx.toSp(),
                fontFamily = FontFamily.Cursive,
                fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal
            )
            var layout = textMeasurer.measure(text, style)
            if (layout.size.width > maxWidth) {
                style = style.copy(fontSize = (fontPx * maxWidth / layout.size.width).toSp())
                layout = textMeasurer.measure(text, style)
            }
            drawText(
                layout,
                topLeft = Offset(centerX - layout.size.width / 2f, rowTop(row) + (rowHeight - layout.size.height) / 2f)
            )
        }

        write("Lakadi", paperTopLeft.x + paperSize.width / 2f, row = 0, maxWidth = paperSize.width * 0.6f, bold = true)

        // Ruling: under the names, down the label column, and a double rule above the totals.
        val left = paperTopLeft.x + paperSize.width * 0.03f
        val right = paperTopLeft.x + paperSize.width * 0.97f
        drawLine(ruling, Offset(left, rowTop(2)), Offset(right, rowTop(2)), strokeWidth = lineWidth)
        drawLine(ruling, Offset(left, rowTop(6) - lineWidth * 1.5f), Offset(right, rowTop(6) - lineWidth * 1.5f), strokeWidth = lineWidth)
        drawLine(ruling, Offset(left, rowTop(6) + lineWidth * 1.5f), Offset(right, rowTop(6) + lineWidth * 1.5f), strokeWidth = lineWidth)
        val divider = paperTopLeft.x + labelWidth
        drawLine(ruling, Offset(divider, rowTop(1)), Offset(divider, rowTop(7)), strokeWidth = lineWidth)

        val cellWidth = columnWidth * 0.92f
        players.forEachIndexed { column, name -> write(name, columnCenter(column), row = 1, maxWidth = cellWidth, bold = true) }
        gameScores.forEachIndexed { game, scores ->
            write("${game + 1}", paperTopLeft.x + labelWidth / 2f, row = game + 2, maxWidth = labelWidth * 0.8f)
            scores.forEachIndexed { column, score ->
                write(score, columnCenter(column), row = game + 2, maxWidth = cellWidth, color = if (score.startsWith("-")) CardInkRed else pencil)
            }
        }
        write("Σ", paperTopLeft.x + labelWidth / 2f, row = 6, maxWidth = labelWidth * 0.8f, bold = true)
        totals.forEachIndexed { column, total ->
            write(total, columnCenter(column), row = 6, maxWidth = cellWidth, color = if (total.startsWith("-")) CardInkRed else pencil, bold = true)
        }
    }
}
