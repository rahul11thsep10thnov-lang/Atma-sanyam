package com.rangepatte.app.ui.components

import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.navigation.BottomNavItem

@Composable
fun BottomNavigationBar(
    currentRoute: String?,
    onItemSelected: (BottomNavItem) -> Unit
) {
    NavigationBar {
        BottomNavItem.entries.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onItemSelected(item) },
                icon = { Icon(imageVector = item.icon, contentDescription = null) },
                label = { Text(stringResource(item.labelRes)) },
                colors = NavigationBarItemDefaults.colors()
            )
        }
    }
}
