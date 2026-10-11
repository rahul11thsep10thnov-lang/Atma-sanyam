package com.rangepatte.app.ui.friends

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp

/** The avatar PNG from `res/drawable` when present; otherwise the avatar number on the disc. (Android-only file.) */
@Composable
fun AvatarArt(resName: String?, size: Dp) {
    val context = LocalContext.current
    val resId = remember(resName) { resName?.let { context.resources.getIdentifier(it, "drawable", context.packageName) } ?: 0 }
    if (resId != 0) Image(painterResource(resId), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(size))
    else Text(resName?.substring(7, 9) ?: "?", style = MaterialTheme.typography.labelLarge, color = Color(0xFF2A1A0A))
}
