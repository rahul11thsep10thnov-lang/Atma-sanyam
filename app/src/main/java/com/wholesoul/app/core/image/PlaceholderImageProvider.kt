package com.wholesoul.app.core.image

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Development-mode [ImageProvider]. Turns an [imageKey] like "fruits/mango-alphonso" into a
 * readable placeholder image URL so every screen has *something* to render. Replace this class
 * alone (via [com.wholesoul.app.di.AppModule]) with a Firebase Storage / Cloudflare R2 / CDN
 * backed provider once real product photography is ready — no other file needs to change.
 */
@Singleton
class PlaceholderImageProvider @Inject constructor() : ImageProvider {

    private val palette = listOf("FFD8B1", "E3F1E5", "FFF8F0", "F0B685", "D9EFE0")

    override fun resolve(imageKey: String): Any {
        val label = imageKey.substringAfterLast('/').replace('-', ' ').take(24)
        val color = palette[imageKey.hashCode().mod(palette.size)]
        val encodedLabel = label.replace(" ", "+")
        return "https://placehold.co/600x600/$color/4A3728.png?text=$encodedLabel&font=roboto"
    }
}
