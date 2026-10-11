package com.rangepatte.app.ui.profile

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.profile.Avatar
import com.rangepatte.app.domain.profile.AvatarCatalog
import com.rangepatte.app.ui.theme.GoldBevelDark

/**
 * One profile picture as a circular disc, at any [size]. The artwork is the drawable named by
 * [Avatar.resName]; until that file is added to `res/drawable` the disc shows its number on the
 * avatar's colour, so the whole flow can be used before the art arrives.
 */
@Composable
fun AvatarView(avatar: Avatar?, size: Dp, modifier: Modifier = Modifier, ring: Color? = null) {
    val context = LocalContext.current
    val resId = remember(avatar?.resName) {
        avatar?.let { context.resources.getIdentifier(it.resName, "drawable", context.packageName) } ?: 0
    }
    val disc = Color(avatar?.discColor ?: 0xFF4A301B)
    Box(
        modifier = modifier
            .size(size)
            .then(if (ring != null) Modifier.border(size * 0.06f, ring, CircleShape) else Modifier)
            .clip(CircleShape)
            .background(Brush.radialGradient(listOf(disc, disc.copy(alpha = 0.75f)))),
        contentAlignment = Alignment.Center
    ) {
        if (resId != 0) {
            Image(painter = painterResource(resId), contentDescription = avatar?.title, contentScale = ContentScale.Crop, modifier = Modifier.size(size))
        } else {
            Text(
                text = avatar?.id?.substringAfter('_') ?: "?",
                style = MaterialTheme.typography.titleLarge,
                color = if (disc.luminance() > 0.5f) GoldBevelDark else Color.White
            )
        }
    }
}

private fun Color.luminance() = 0.299f * red + 0.587f * green + 0.114f * blue

/** The signed-in player's own avatar, for the top bar and tables. */
@Composable
fun MyAvatar(avatarId: String?, size: Dp = 32.dp, modifier: Modifier = Modifier) =
    AvatarView(AvatarCatalog.byId(avatarId), size, modifier)
