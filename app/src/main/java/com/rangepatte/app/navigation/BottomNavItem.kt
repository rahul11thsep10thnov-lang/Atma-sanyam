package com.rangepatte.app.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Style
import androidx.compose.ui.graphics.vector.ImageVector
import com.rangepatte.app.R

enum class BottomNavItem(val route: String, @StringRes val labelRes: Int, val icon: ImageVector) {
    GAMES(Routes.GAMES, R.string.nav_games, Icons.Filled.Style),
    ENTERTAINMENT(Routes.ENTERTAINMENT, R.string.nav_entertainment, Icons.Filled.Celebration),
    SETTINGS(Routes.SETTINGS, R.string.nav_settings, Icons.Filled.Settings)
}
