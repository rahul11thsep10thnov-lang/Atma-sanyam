package com.wholesoul.app.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.domain.model.AuthState
import com.wholesoul.app.navigation.LegalDocType

private data class ProfileMenuItem(val icon: ImageVector, val label: String, val action: ProfileAction)

private sealed interface ProfileAction {
    data object MyOrders : ProfileAction
    data object Addresses : ProfileAction
    data object Wishlist : ProfileAction
    data object Payments : ProfileAction
    data object Coupons : ProfileAction
    data object Notifications : ProfileAction
    data object Help : ProfileAction
    data class Legal(val docType: LegalDocType) : ProfileAction
}

@Composable
fun ProfileScreen(
    onNavigateOrders: () -> Unit,
    onNavigateAddresses: () -> Unit,
    onNavigateWishlist: () -> Unit,
    onNavigateOffers: () -> Unit,
    onNavigateNotifications: () -> Unit,
    onNavigateHelp: () -> Unit,
    onNavigateLegal: (LegalDocType) -> Unit,
    onLoggedOut: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val user by viewModel.currentUser.collectAsState()

    val menuItems = listOf(
        ProfileMenuItem(Icons.Filled.Receipt, "My Orders", ProfileAction.MyOrders),
        ProfileMenuItem(Icons.Filled.LocationOn, "Saved Addresses", ProfileAction.Addresses),
        ProfileMenuItem(Icons.Filled.Favorite, "Wishlist", ProfileAction.Wishlist),
        ProfileMenuItem(Icons.Filled.Payment, "Payments", ProfileAction.Payments),
        ProfileMenuItem(Icons.Filled.LocalOffer, "Coupons & Offers", ProfileAction.Coupons),
        ProfileMenuItem(Icons.Filled.Notifications, "Notifications", ProfileAction.Notifications),
        ProfileMenuItem(Icons.Filled.Help, "Help & Support", ProfileAction.Help),
        ProfileMenuItem(Icons.Filled.Info, "About WHOLESOUL", ProfileAction.Legal(LegalDocType.ABOUT)),
        ProfileMenuItem(Icons.Filled.Description, "Terms & Conditions", ProfileAction.Legal(LegalDocType.TERMS)),
        ProfileMenuItem(Icons.Filled.Description, "Privacy Policy", ProfileAction.Legal(LegalDocType.PRIVACY_POLICY)),
    )

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Profile")

        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier.size(56.dp).clip(CircleShape).background(WholesoulColors.LeafLight),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Person, contentDescription = null, tint = WholesoulColors.LeafDark)
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(user?.name ?: "Guest", style = MaterialTheme.typography.titleMedium)
                Text(
                    if (user?.authState == AuthState.GUEST) "Browsing as guest" else (user?.mobileNumber?.let { "+91 $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = WholesoulColors.TextSecondary,
                )
            }
        }
        HorizontalDivider()

        LazyColumn(modifier = Modifier.weight(1f)) {
            items(menuItems) { item ->
                ProfileRow(item) {
                    when (item.action) {
                        ProfileAction.MyOrders -> onNavigateOrders()
                        ProfileAction.Addresses -> onNavigateAddresses()
                        ProfileAction.Wishlist -> onNavigateWishlist()
                        ProfileAction.Payments -> onNavigateOffers()
                        ProfileAction.Coupons -> onNavigateOffers()
                        ProfileAction.Notifications -> onNavigateNotifications()
                        ProfileAction.Help -> onNavigateHelp()
                        is ProfileAction.Legal -> onNavigateLegal(item.action.docType)
                    }
                }
            }
            item {
                ProfileRow(ProfileMenuItem(Icons.Filled.ExitToApp, "Logout", ProfileAction.Help)) {
                    viewModel.logout(onLoggedOut)
                }
            }
        }
    }
}

@Composable
private fun ProfileRow(item: ProfileMenuItem, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(item.icon, contentDescription = null, tint = WholesoulColors.TextSecondary, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(16.dp))
            Text(item.label, style = MaterialTheme.typography.bodyLarge)
        }
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = WholesoulColors.TextTertiary)
    }
    HorizontalDivider(color = WholesoulColors.Divider)
}
