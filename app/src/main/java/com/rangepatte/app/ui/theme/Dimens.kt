package com.rangepatte.app.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Centralized spacing scale — never hard-code a raw `.dp` spacing value in a screen/component. */
object Spacing {
    val Small: Dp = 8.dp
    val Medium: Dp = 16.dp
    val Large: Dp = 24.dp
    val XLarge: Dp = 32.dp
}

/** Corner radii per element family, so "how rounded" stays a single decision per surface type. */
object Radii {
    val Card: Dp = 10.dp
    val Button: Dp = 12.dp
    val Panel: Dp = 14.dp
    val Charpai: Dp = 22.dp
}

/** Elevation used as the base for shadow tokens below (paired with tinted shadow colors in Color.kt). */
object Elevation {
    val CardResting: Dp = 2.dp
    val CardRaised: Dp = 10.dp
    val Button: Dp = 3.dp
    val Charpai: Dp = 6.dp
}
