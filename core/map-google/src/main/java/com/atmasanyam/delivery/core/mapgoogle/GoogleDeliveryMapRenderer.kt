package com.atmasanyam.delivery.core.mapgoogle

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.mapapi.DeliveryMapRenderer
import com.atmasanyam.delivery.core.model.GeoPoint
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.PolyUtil
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState

private val INDIA_CENTER = LatLng(20.5937, 78.9629)
private const val DEFAULT_ZOOM = 4.5f
private const val ROUTE_ZOOM = 13f

/**
 * Renders [DeliveryMapRenderer] using the Google Maps SDK (via maps-compose). This is the only
 * class in the app that imports anything from Google's Maps libraries - swapping to a different
 * provider means writing a sibling implementation of the same interface, not touching any
 * feature screen.
 */
class GoogleDeliveryMapRenderer : DeliveryMapRenderer {

    @Composable
    override fun Render(
        pickup: GeoPoint?,
        destination: GeoPoint?,
        encodedRoutePolyline: String?,
        modifier: Modifier,
    ) {
        // No real key configured yet (see README) - render a plain placeholder instead of a
        // GoogleMap. This isn't just cosmetic: an empty/missing API key is a known cause of
        // the Maps SDK throwing at map-creation time on some versions, and this can't be
        // tested on a real device from where this code is written, so the safer default is
        // to never construct a GoogleMap without a non-blank key at all.
        if (BuildConfig.MAPS_API_KEY.isBlank()) {
            NoApiKeyPlaceholder(modifier)
            return
        }

        val pickupLatLng = pickup?.toLatLng()
        val destinationLatLng = destination?.toLatLng()

        val cameraPositionState = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(INDIA_CENTER, DEFAULT_ZOOM)
        }

        // rememberCameraPositionState's initial position only applies once, on first
        // composition - re-centering when pickup/destination change (e.g. the user just
        // finished typing) needs an explicit move, not just a different initial value.
        LaunchedEffect(pickupLatLng, destinationLatLng) {
            if (pickupLatLng != null && destinationLatLng != null) {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(midpoint(pickupLatLng, destinationLatLng), ROUTE_ZOOM),
                )
            }
        }

        GoogleMap(modifier = modifier, cameraPositionState = cameraPositionState) {
            pickupLatLng?.let { Marker(state = MarkerState(position = it), title = "Pickup") }
            destinationLatLng?.let { Marker(state = MarkerState(position = it), title = "Destination") }

            val routePoints = when {
                !encodedRoutePolyline.isNullOrBlank() -> PolyUtil.decode(encodedRoutePolyline)
                pickupLatLng != null && destinationLatLng != null -> listOf(pickupLatLng, destinationLatLng)
                else -> emptyList()
            }
            if (routePoints.size >= 2) {
                Polyline(points = routePoints)
            }
        }
    }
}

@Composable
private fun NoApiKeyPlaceholder(modifier: Modifier = Modifier) {
    Surface(modifier = modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surfaceVariant) {
        Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Text(
                text = "Map preview unavailable - add a Google Maps API key to secrets.properties (see README).",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun GeoPoint.toLatLng() = LatLng(latitude, longitude)

private fun midpoint(a: LatLng, b: LatLng) = LatLng((a.latitude + b.latitude) / 2.0, (a.longitude + b.longitude) / 2.0)
