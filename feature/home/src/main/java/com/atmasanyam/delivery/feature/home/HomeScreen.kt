package com.atmasanyam.delivery.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.atmasanyam.delivery.core.designsystem.components.LocationField
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.mapapi.DeliveryMapRenderer
import com.atmasanyam.delivery.core.model.AppLanguage
import com.atmasanyam.delivery.core.model.DeliveryLocation
import com.atmasanyam.delivery.core.model.GeoPoint
import com.atmasanyam.delivery.core.model.Route

@Composable
fun HomeRoute(
    mapRenderer: DeliveryMapRenderer,
    onEnterGoodsDetails: (pickup: DeliveryLocation, destination: DeliveryLocation, route: Route) -> Unit,
    onLanguageSelected: (AppLanguage) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    // Read from the live configuration so the menu's tick always matches what's on screen
    // (including when the app starts in the phone's own language).
    val currentLanguage = AppLanguage.fromTag(LocalConfiguration.current.locales[0].language)
    val currentLocationLabel = stringResource(R.string.home_current_location)
    HomeScreen(
        uiState = uiState,
        mapRenderer = mapRenderer,
        currentLanguage = currentLanguage,
        onLanguageSelected = onLanguageSelected,
        onPickupTextChanged = viewModel::onPickupTextChanged,
        onDestinationTextChanged = viewModel::onDestinationTextChanged,
        onUseCurrentLocationForPickup = { viewModel.onUseCurrentLocationForPickup(currentLocationLabel) },
        onEnterGoodsDetails = {
            uiState.toPickupDestinationRoute()?.let { (pickup, destination, route) ->
                onEnterGoodsDetails(pickup, destination, route)
            }
        },
        modifier = modifier,
    )
}

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    mapRenderer: DeliveryMapRenderer,
    currentLanguage: AppLanguage,
    onLanguageSelected: (AppLanguage) -> Unit,
    onPickupTextChanged: (String) -> Unit,
    onDestinationTextChanged: (String) -> Unit,
    onUseCurrentLocationForPickup: () -> Unit,
    onEnterGoodsDetails: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            HomeHeader(currentLanguage = currentLanguage, onLanguageSelected = onLanguageSelected)

            Text(
                text = stringResource(R.string.home_title),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(top = 16.dp, bottom = 20.dp),
            )

            Text(
                text = stringResource(R.string.home_pickup_question),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            LocationField(
                label = stringResource(R.string.home_pickup_label),
                value = uiState.pickupText,
                onValueChange = onPickupTextChanged,
                leadingIcon = Icons.Filled.Place,
                placeholder = stringResource(R.string.home_pickup_placeholder),
                onCurrentLocationClick = onUseCurrentLocationForPickup,
            )

            Text(
                text = stringResource(R.string.home_destination_question),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
            )
            LocationField(
                label = stringResource(R.string.home_destination_label),
                value = uiState.destinationText,
                onValueChange = onDestinationTextChanged,
                leadingIcon = Icons.Filled.LocationOn,
                placeholder = stringResource(R.string.home_destination_placeholder),
            )

            MapPreview(
                mapRenderer = mapRenderer,
                pickupPoint = uiState.pickupPoint,
                destinationPoint = uiState.destinationPoint,
                showRoute = uiState.showRoutePreview,
                distanceKm = uiState.mockDistanceKm,
                etaMinutes = uiState.mockEtaMinutes,
                modifier = Modifier.padding(top = 20.dp),
            )

            PrimaryButton(
                text = stringResource(R.string.home_enter_goods),
                onClick = onEnterGoodsDetails,
                enabled = uiState.canEnterGoodsDetails,
                modifier = Modifier.padding(top = 20.dp, bottom = 8.dp),
            )
        }
    }
}

@Composable
private fun HomeHeader(
    currentLanguage: AppLanguage,
    onLanguageSelected: (AppLanguage) -> Unit,
    modifier: Modifier = Modifier,
) {
    var menuExpanded by remember { mutableStateOf(false) }
    var showAbout by remember { mutableStateOf(false) }

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(
                text = stringResource(R.string.home_brand),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = stringResource(R.string.home_tagline),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        // The menu must be anchored in the same Box as the button so it drops down from it.
        Box {
            IconButton(onClick = { menuExpanded = true }) {
                Icon(Icons.Filled.Menu, contentDescription = stringResource(R.string.home_menu))
            }
            DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                Text(
                    text = stringResource(R.string.home_menu_language),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
                AppLanguage.entries.forEach { language ->
                    DropdownMenuItem(
                        text = { Text(language.nativeName) },
                        trailingIcon = {
                            if (language == currentLanguage) {
                                Icon(Icons.Filled.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            }
                        },
                        onClick = {
                            menuExpanded = false
                            if (language != currentLanguage) onLanguageSelected(language)
                        },
                    )
                }
                HorizontalDivider()
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.home_menu_about)) },
                    leadingIcon = { Icon(Icons.Filled.Info, contentDescription = null) },
                    onClick = {
                        menuExpanded = false
                        showAbout = true
                    },
                )
            }
        }
    }

    if (showAbout) {
        AlertDialog(
            onDismissRequest = { showAbout = false },
            title = { Text(stringResource(R.string.home_about_title)) },
            text = { Text(stringResource(R.string.home_about_body)) },
            confirmButton = {
                TextButton(onClick = { showAbout = false }) {
                    Text(stringResource(R.string.home_about_close))
                }
            },
        )
    }
}

@Composable
private fun MapPreview(
    mapRenderer: DeliveryMapRenderer,
    pickupPoint: GeoPoint?,
    destinationPoint: GeoPoint?,
    showRoute: Boolean,
    distanceKm: Double?,
    etaMinutes: Int?,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        mapRenderer.Render(
            pickup = pickupPoint,
            destination = destinationPoint,
            encodedRoutePolyline = null,
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp),
        )
        if (showRoute && distanceKm != null && etaMinutes != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                RouteStat(
                    icon = Icons.Filled.Straighten,
                    label = stringResource(R.string.home_distance),
                    value = stringResource(R.string.home_distance_value, distanceKm),
                )
                RouteStat(
                    icon = Icons.Filled.Schedule,
                    label = stringResource(R.string.home_eta),
                    value = stringResource(R.string.home_eta_value, etaMinutes),
                )
            }
        }
    }
}

@Composable
private fun RouteStat(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
        Column(modifier = Modifier.padding(start = 6.dp)) {
            Text(text = label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(text = value, style = MaterialTheme.typography.titleMedium)
        }
    }
}
