package com.wholesoul.app.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import com.wholesoul.app.core.designsystem.WholesoulColors

/**
 * Central place every screen goes through to render a product/category/banner image.
 * Handles the loading shimmer + broken-image fallback so individual screens don't repeat it.
 */
@Composable
fun WholesoulImage(
    model: Any,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
) {
    SubcomposeAsyncImage(
        model = model,
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = contentScale,
        loading = {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(WholesoulColors.SurfaceAlt),
            )
        },
        error = {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(WholesoulColors.LeafLight),
            )
        },
        success = { SubcomposeAsyncImageContent() },
    )
}
