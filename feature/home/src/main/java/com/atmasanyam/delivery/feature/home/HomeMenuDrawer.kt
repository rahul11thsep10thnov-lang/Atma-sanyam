package com.atmasanyam.delivery.feature.home

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.DrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.MenuRow

/** The hamburger menu entries, in the order they are shown. Exactly these eight. */
enum class HomeMenuItem {
    PROFILE,
    HELP,
    BOOKING_HISTORY,
    SAFETY,
    REFER_AND_EARN,
    MY_REWARDS,
    NOTIFICATIONS,
    SETTINGS,
}

private data class MenuEntry(val item: HomeMenuItem, val icon: ImageVector, val titleRes: Int)

private val MenuEntries = listOf(
    MenuEntry(HomeMenuItem.PROFILE, Icons.Outlined.Person, R.string.home_menu_profile),
    MenuEntry(HomeMenuItem.HELP, Icons.Outlined.HelpOutline, R.string.home_menu_help),
    MenuEntry(HomeMenuItem.BOOKING_HISTORY, Icons.Outlined.History, R.string.home_menu_booking_history),
    MenuEntry(HomeMenuItem.SAFETY, Icons.Outlined.Security, R.string.home_menu_safety),
    MenuEntry(HomeMenuItem.REFER_AND_EARN, Icons.Outlined.CardGiftcard, R.string.home_menu_refer_and_earn),
    MenuEntry(HomeMenuItem.MY_REWARDS, Icons.Outlined.EmojiEvents, R.string.home_menu_my_rewards),
    MenuEntry(HomeMenuItem.NOTIFICATIONS, Icons.Outlined.Notifications, R.string.home_menu_notifications),
    MenuEntry(HomeMenuItem.SETTINGS, Icons.Outlined.Settings, R.string.home_menu_settings),
)

/**
 * Drawer sheet with the brand header and the eight menu rows. It scrolls, so every row stays
 * reachable on short screens or with large font sizes.
 */
@Composable
internal fun HomeMenuSheet(
    userLabel: String?,
    onItemSelected: (HomeMenuItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    ModalDrawerSheet(
        modifier = modifier,
        drawerContainerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(modifier = Modifier.fillMaxHeight().verticalScroll(rememberScrollState())) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 24.dp)) {
                Text(
                    text = stringResource(R.string.home_brand),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = userLabel ?: stringResource(R.string.home_menu_guest),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            MenuEntries.forEachIndexed { index, entry ->
                MenuRow(
                    icon = entry.icon,
                    title = stringResource(entry.titleRes),
                    onClick = { onItemSelected(entry.item) },
                )
                if (index < MenuEntries.lastIndex) {
                    HorizontalDivider(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 60.dp, end = 20.dp),
                        color = MaterialTheme.colorScheme.outlineVariant,
                    )
                }
            }
        }
    }
}

/**
 * A drawer state that always starts closed. rememberDrawerState() would restore an "open" drawer
 * when coming back from a menu screen, because the state is saved as the Home screen leaves.
 */
internal fun newClosedDrawerState(): DrawerState = DrawerState(DrawerValue.Closed)
