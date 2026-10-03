package com.rangepatte.app.ui.components

import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.navigation.BottomNavItem
import com.rangepatte.app.ui.theme.ButtonCrimsonBottom
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle

/** Dark-wood tab bar with a gold top rule; the selected tab sits on a crimson plaque in gold. */
@Composable
fun BottomNavigationBar(
    currentRoute: String?,
    onItemSelected: (BottomNavItem) -> Unit
) {
    NavigationBar(
        containerColor = PanelWoodDark,
        modifier = Modifier.drawWithContent {
            drawContent()
            drawLine(
                color = GoldBevelDark,
                start = Offset(0f, 0f),
                end = Offset(size.width, 0f),
                strokeWidth = 2.dp.toPx()
            )
        }
    ) {
        BottomNavItem.entries.forEach { item ->
            NavigationBarItem(
                selected = currentRoute == item.route,
                onClick = { onItemSelected(item) },
                icon = { Icon(imageVector = item.icon, contentDescription = null) },
                label = {
                    Text(
                        text = stringResource(item.labelRes).uppercase(),
                        style = RoyalLabelStyle.copy(fontSize = 12.sp, letterSpacing = 0.8.sp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = GoldBevelLight,
                    selectedTextColor = GoldBevelLight,
                    indicatorColor = ButtonCrimsonBottom,
                    unselectedIconColor = ParchmentTextDim,
                    unselectedTextColor = ParchmentTextDim
                )
            )
        }
    }
}
