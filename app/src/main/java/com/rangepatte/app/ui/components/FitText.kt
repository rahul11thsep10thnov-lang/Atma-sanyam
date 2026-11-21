package com.rangepatte.app.ui.components

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.isSpecified
import androidx.compose.ui.unit.sp
import com.rangepatte.app.ui.theme.TypeScale

/**
 * Text that keeps its style's size when it fits, and steps down a little (never below [minFontSize])
 * when it would otherwise be cut off with "…" or broken in the middle of a word — a long Hindi label,
 * a narrow phone, or a large system font size. Used for short labels in fixed spaces: tab labels, button
 * text, game-name plaques, table cells. At [minFontSize] it ends with "…" as a last resort.
 *
 * The size is worked out before drawing (with a text measurer), so nothing flickers.
 */
@Composable
fun FitText(
    text: String,
    style: TextStyle,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified,
    fontWeight: FontWeight? = null,
    textAlign: TextAlign? = null,
    maxLines: Int = 1,
    minFontSize: TextUnit = TypeScale.MINIMUM.sp
) {
    val alignment = when (textAlign) {
        TextAlign.Center -> Alignment.Center
        TextAlign.End, TextAlign.Right -> Alignment.CenterEnd
        else -> Alignment.CenterStart
    }
    BoxWithConstraints(modifier = modifier, contentAlignment = alignment) {
        val measurer = rememberTextMeasurer()
        val base = if (fontWeight != null) style.copy(fontWeight = fontWeight) else style
        val maxWidth = constraints.maxWidth
        val fitted = remember(text, base, maxWidth, maxLines, minFontSize) {
            if (maxWidth == Constraints.Infinity || !base.fontSize.isSpecified) return@remember base
            val floor = (minFontSize.value / base.fontSize.value).coerceAtMost(1f)
            var scale = 1f
            while (true) {
                val result = measurer.measure(
                    text = text,
                    style = scaled(base, scale),
                    overflow = TextOverflow.Ellipsis,
                    maxLines = maxLines,
                    constraints = Constraints(maxWidth = maxWidth)
                )
                if (!result.hasVisualOverflow && !splitsAWord(result, text)) break
                val next = maxOf(scale * 0.92f, floor)
                if (next >= scale - 0.001f) break
                scale = next
            }
            scaled(base, scale)
        }
        Text(
            text = text,
            style = fitted,
            color = color,
            textAlign = textAlign,
            maxLines = maxLines,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun scaled(style: TextStyle, scale: Float): TextStyle =
    if (scale == 1f) style
    else style.copy(
        fontSize = style.fontSize * scale,
        lineHeight = if (style.lineHeight.isSpecified) style.lineHeight * scale else style.lineHeight
    )

/** True when a line ends inside a word (no space, slash or dash at the break). */
private fun splitsAWord(result: TextLayoutResult, text: String): Boolean {
    for (line in 0 until result.lineCount - 1) {
        val end = result.getLineEnd(line)
        if (end <= 0 || end >= text.length) continue
        val before = text[end - 1]
        val after = text[end]
        val breakable = before.isWhitespace() || after.isWhitespace() || before in "/-–—·,"
        if (!breakable) return true
    }
    return false
}
