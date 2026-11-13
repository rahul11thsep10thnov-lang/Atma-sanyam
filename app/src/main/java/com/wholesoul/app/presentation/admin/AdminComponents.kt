package com.wholesoul.app.presentation.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.WholesoulImage
import com.wholesoul.app.core.image.LocalImageProvider

/** Small square photo used in every admin list and form. */
@Composable
fun AdminThumbnail(imageKey: String, description: String, modifier: Modifier = Modifier, size: Dp = 56.dp) {
    val imageProvider = LocalImageProvider.current
    WholesoulImage(
        model = imageProvider.resolve(imageKey),
        contentDescription = description,
        modifier = modifier.size(size).clip(RoundedCornerShape(10.dp)),
    )
}

/** Little coloured label such as "Hidden" or "Sold out". */
@Composable
fun AdminTag(text: String, modifier: Modifier = Modifier, warning: Boolean = false) {
    Box(
        modifier = modifier
            .background(
                if (warning) WholesoulColors.Error.copy(alpha = 0.12f) else WholesoulColors.SurfaceAlt,
                RoundedCornerShape(6.dp),
            )
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            color = if (warning) WholesoulColors.Error else WholesoulColors.TextSecondary,
        )
    }
}

/** Up / down arrows used to sequence categories and items. */
@Composable
fun ReorderButtons(
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    subject: String,
) {
    Row {
        IconButton(onClick = onMoveUp, enabled = canMoveUp) {
            Icon(Icons.Filled.ArrowUpward, contentDescription = "Move $subject up")
        }
        IconButton(onClick = onMoveDown, enabled = canMoveDown) {
            Icon(Icons.Filled.ArrowDownward, contentDescription = "Move $subject down")
        }
    }
}
