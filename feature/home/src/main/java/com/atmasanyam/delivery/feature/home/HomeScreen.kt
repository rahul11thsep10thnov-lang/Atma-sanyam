package com.atmasanyam.delivery.feature.home

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.atmasanyam.delivery.core.designsystem.components.LocationField
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.mapapi.DeliveryMapRenderer
import com.atmasanyam.delivery.core.model.DeliveryLocation
import com.atmasanyam.delivery.core.model.GeoPoint
import com.atmasanyam.delivery.core.model.Route

@Composable
fun HomeRoute(
    mapRenderer: DeliveryMapRenderer,
    onEnterGoodsDetails: (pickup: DeliveryLocation, destination: DeliveryLocation, route: Route) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    HomeScreen(
        uiState = uiState,
        mapRenderer = mapRenderer,
        onPickupTextChanged = viewModel::onPickupTextChanged,
        onDestinationTextChanged = viewModel::onDestinationTextChanged,
        onUseCurrentLocationForPickup = viewModel::onUseCurrentLocationForPickup,
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
            HomeHeader()

            Text(
                text = "Deliver anything from shop to home",
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(top = 16.dp, bottom = 20.dp),
            )

            Text(
                text = "Where should we pick up?",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            LocationField(
                label = "Pickup location",
                value = uiState.pickupText,
                onValueChange = onPickupTextChanged,
                leadingIcon = Icons.Filled.Place,
                placeholder = "Search shop or address",
                onCurrentLocationClick = onUseCurrentLocationForPickup,
            )

            Text(
                text = "Where should we deliver?",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
            )
            LocationField(
                label = "Destination",
                value = uiState.destinationText,
                onValueChange = onDestinationTextChanged,
                leadingIcon = Icons.Filled.LocationOn,
                placeholder = "Search home or address",
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
                text = "Enter goods details",
                onClick = onEnterGoodsDetails,
                enabled = uiState.canEnterGoodsDetails,
                modifier = Modifier.padding(top = 20.dp, bottom = 8.dp),
            )
        }
    }
}

@Composable
private fun HomeHeader(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(
                text = "PrayagVaahan",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "Goods delivery, on demand",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = { /* Phase 22: profile / saved addresses / menu */ }) {
            Icon(Icons.Filled.Menu, contentDescription = "Menu")
        }
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
                RouteStat(icon = Icons.Filled.Straighten, label = "Distance", value = "%.1f km".format(distanceKm))
                RouteStat(icon = Icons.Filled.Schedule, label = "ETA", value = "$etaMinutes min")
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
