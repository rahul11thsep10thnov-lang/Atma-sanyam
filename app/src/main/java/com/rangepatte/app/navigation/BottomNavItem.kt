package com.rangepatte.app.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Style
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.annotation.StringRes
import com.rangepatte.app.R

enum class BottomNavItem(val route: String, @StringRes val labelRes: Int, val icon: ImageVector) {
    HOME(Routes.HOME, R.string.nav_home, Icons.Filled.Home),
    GAMES(Routes.GAMES, R.string.nav_games, Icons.Filled.Style),
    HISTORY(Routes.HISTORY, R.string.nav_history, Icons.Filled.History),
    SETTINGS(Routes.SETTINGS, R.string.nav_settings, Icons.Filled.Settings)
}
