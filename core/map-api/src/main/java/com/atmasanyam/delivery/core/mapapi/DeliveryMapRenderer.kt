package com.atmasanyam.delivery.core.mapapi

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.atmasanyam.delivery.core.model.GeoPoint

/**
 * Everything a screen needs to draw a pickup->destination map, independent of which map
 * provider is actually rendering it (Google Maps today, Mappls or another provider later).
 *
 * Feature modules depend only on this interface, never on a concrete provider - swapping
 * providers means adding a new `core:map-<provider>` implementation and changing which one
 * the app module wires up, with zero changes to feature code.
 */
interface DeliveryMapRenderer {

    @Composable
    fun Render(
        pickup: GeoPoint?,
        destination: GeoPoint?,
        /** Google-encoded polyline for the road route, once Phase 4/5 supply a real one. */
        encodedRoutePolyline: String?,
        modifier: Modifier,
    )
}
