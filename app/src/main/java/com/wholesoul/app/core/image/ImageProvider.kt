package com.wholesoul.app.core.image

/**
 * Resolves an opaque [imageKey] (stored on every domain model) into a loadable image
 * reference for Coil. Swap [PlaceholderImageProvider] for a CDN/Firebase-Storage/local-asset
 * backed implementation later without touching any screen — no UI code ever builds a URL
 * or a resource id directly.
 */
interface ImageProvider {
    /** Returns anything Coil's AsyncImage can consume: a URL String, a Uri, or a drawable res id. */
    fun resolve(imageKey: String): Any
}
