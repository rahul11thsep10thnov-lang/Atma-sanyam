package com.wholesoul.app.core.designsystem

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val WholesoulShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

/** Spacing scale used across all screens instead of ad-hoc dp values. */
object WholesoulSpacing {
    val xxs = 4.dp
    val xs = 8.dp
    val sm = 12.dp
    val md = 16.dp
    val lg = 20.dp
    val xl = 24.dp
    val xxl = 32.dp
}

/** Standard corner radius for product/category cards, distinct from dialogs/sheets. */
object WholesoulRadius {
    val card = 14.dp
    val chip = 20.dp
    val sheet = 24.dp
    val button = 12.dp
}
