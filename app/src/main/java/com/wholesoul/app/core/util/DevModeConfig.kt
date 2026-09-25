package com.wholesoul.app.core.util

import com.wholesoul.app.BuildConfig
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single switch (spec section 39). When true, every repository binding resolves to its
 * mock/local implementation and the whole app — auth, catalog, cart, orders, payments,
 * notifications, serviceability — runs with zero network calls. Flip only this flag
 * (plus swap the Hilt bindings in di/RepositoryModule) once a real backend exists.
 */
@Singleton
class DevModeConfig @Inject constructor() {
    val isDevelopmentMode: Boolean = BuildConfig.DEVELOPMENT_MODE
}

object Constants {
    const val FREE_DELIVERY_THRESHOLD = 299.0
    const val DEFAULT_DELIVERY_FEE = 20.0
    const val DEFAULT_HANDLING_FEE = 4.0
    const val NETWORK_SIMULATED_DELAY_MS = 350L
}
