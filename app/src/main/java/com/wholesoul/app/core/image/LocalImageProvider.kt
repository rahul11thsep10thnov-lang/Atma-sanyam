package com.wholesoul.app.core.image

import androidx.compose.runtime.staticCompositionLocalOf

/** Provided once at the navigation root (see MainActivity) so any screen can resolve an imageKey. */
val LocalImageProvider = staticCompositionLocalOf<ImageProvider> {
    error("No ImageProvider provided. Wrap the app content in CompositionLocalProvider(LocalImageProvider provides ...)")
}
