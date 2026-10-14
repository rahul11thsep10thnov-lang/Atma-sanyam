package com.rangepatte.app.ui.settings

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.ui.motion.OrientationMode
import com.rangepatte.app.ui.motion.OrientationPrefs
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight

/** Three choices — Portrait, Landscape, Auto — each a phone icon over its name; the chosen one has a gold border. */
@Composable
fun OrientationPicker(modifier: Modifier = Modifier) {
    val current by OrientationPrefs.mode.collectAsState()
    Row(modifier = modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OrientationMode.entries.forEach { mode ->
            val selected = mode == current
            val label = stringResource(when (mode) {
                OrientationMode.PORTRAIT -> R.string.orientation_portrait
                OrientationMode.LANDSCAPE -> R.string.orientation_landscape
                OrientationMode.AUTO -> R.string.orientation_auto
            })
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .weight(1f)
                    .background(if (selected) Color(0x33FFD36B) else Color(0x22000000), RoundedCornerShape(10.dp))
                    .border(if (selected) 2.dp else 1.dp, if (selected) GoldBevelLight else GoldBevelDark, RoundedCornerShape(10.dp))
                    .clickable(role = Role.RadioButton) { OrientationPrefs.set(mode) }
                    .padding(vertical = 10.dp, horizontal = 4.dp)
            ) {
                Canvas(modifier = Modifier.size(44.dp)) { drawModeIcon(mode, if (selected) GoldBevelLight else GoldBevelLight.copy(alpha = 0.7f)) }
                Text(text = label, color = GoldBevelLight, fontSize = 13.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

/** A phone outline: tall for Portrait, wide for Landscape, and both overlaid with a turn arrow for Auto. */
private fun DrawScope.drawModeIcon(mode: OrientationMode, color: Color) {
    val stroke = Stroke(width = size.minDimension * 0.07f)
    fun phone(w: Float, h: Float) {
        val tl = Offset((size.width - w) / 2f, (size.height - h) / 2f)
        drawRoundRect(color, tl, Size(w, h), CornerRadius(w * 0.14f), style = stroke)
    }
    val tall = size.minDimension * 0.5f
    val long = size.minDimension * 0.86f
    when (mode) {
        OrientationMode.PORTRAIT -> {
            phone(tall, long)
            drawCircle(color, size.minDimension * 0.03f, Offset(size.width / 2f, size.height / 2f + long / 2f - tall * 0.16f))
        }
        OrientationMode.LANDSCAPE -> {
            phone(long, tall)
            drawCircle(color, size.minDimension * 0.03f, Offset(size.width / 2f + long / 2f - tall * 0.16f, size.height / 2f))
        }
        OrientationMode.AUTO -> {
            phone(tall * 0.8f, long * 0.8f)
            rotate(90f) { phone(tall * 0.8f, long * 0.8f) }
            // A small turning arc with an arrow head, at the top-right.
            val c = Offset(size.width * 0.82f, size.height * 0.2f)
            val r = size.minDimension * 0.12f
            drawArc(color, 200f, 220f, false, Offset(c.x - r, c.y - r), Size(r * 2, r * 2), style = stroke)
            drawCircle(color, r * 0.3f, Offset(c.x + r * 0.9f, c.y + r * 0.3f))
        }
    }
}
