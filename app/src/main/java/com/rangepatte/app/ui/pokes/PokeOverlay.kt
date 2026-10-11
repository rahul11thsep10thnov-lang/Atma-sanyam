package com.rangepatte.app.ui.pokes

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.ui.friends.PersonAvatar
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

/** What the overlay needs to know about one poke being shown. */
data class PokeShow(
    val key: Long,
    val fromUid: String,
    val name: String,
    val avatarId: String?,
    /** At a table: the banner only, no shiver and no hand (never over the cards). */
    val bannerOnly: Boolean,
    /** The system asks for less motion: fade the banner in, nothing moves. */
    val reduceMotion: Boolean,
    val canPokeBack: Boolean
)

/** How long the banner stays before it slides away on its own. */
const val POKE_BANNER_MS = 5_000L

/**
 * The receiver's side of a poke (Element 14, Design 1): one short shiver of the page (driven through
 * [shake], which the host applies to its content), a gold pointing hand that taps twice in the middle
 * of the screen, and a parchment banner that drops from under the top bar: "rahul29 poked you ·
 * Poke back". Tapping the name opens the profile; the banner leaves after five seconds or on tap.
 */
@Composable
fun BoxScope.PokeOverlay(
    show: PokeShow,
    shake: Animatable<Float, *>,
    onPokeBack: () -> Unit,
    onOpenPerson: () -> Unit,
    onDone: () -> Unit
) {
    val hand = remember(show.key) { Animatable(0f) }
    val banner = remember(show.key) { Animatable(0f) }
    var leaving by remember(show.key) { mutableStateOf(false) }

    LaunchedEffect(show.key) {
        if (!show.bannerOnly && !show.reduceMotion) {
            // 0.4 s shiver: the page moves a few pixels side to side and settles.
            shake.snapTo(0f)
            shake.animateTo(0f, keyframes { durationMillis = 400; -6f at 50; 6f at 100; -4f at 150; 4f at 200; -2f at 250; 2f at 300; 0f at 400 })
        }
        banner.animateTo(1f, if (show.reduceMotion) tween(300) else keyframes { durationMillis = 450; 0f at 0; 1.04f at 300; 1f at 450 })
        if (!show.bannerOnly && !show.reduceMotion) {
            // The hand taps twice: appear, press, lift, press, lift, fade.
            hand.animateTo(1f, keyframes { durationMillis = 1_200; 0f at 0; 1.2f at 150; 1f at 300; 1.15f at 450; 1f at 600; 1f at 900; 0f at 1_200 })
        }
        delay(POKE_BANNER_MS - 1_500)
        leaving = true
        banner.animateTo(0f, tween(250))
        onDone()
    }

    // The hand: a gold pointing finger in the middle of the screen, scaled by the tap animation.
    if (!show.bannerOnly && hand.value > 0.01f) {
        Text(
            text = "👉",
            fontSize = 64.sp,
            modifier = Modifier
                .align(Alignment.Center)
                .scale(hand.value.coerceAtMost(1.3f))
                .alpha(hand.value.coerceIn(0f, 1f))
        )
    }

    // The banner: parchment, under the top bar.
    val progress = banner.value
    val offsetY = ((1f - progress.coerceAtMost(1f)) * -120f)
    val bannerLabel = stringResource(R.string.poke_received_format, show.name)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .align(Alignment.TopCenter)
            .padding(horizontal = 10.dp, vertical = 8.dp)
            .fillMaxWidth()
            .offset { IntOffset(0, offsetY.roundToInt()) }
            .alpha(progress.coerceIn(0f, 1f))
            .scale(if (progress > 1f) progress else 1f)
            .shadow(10.dp, RoundedCornerShape(10.dp))
            .background(Color(0xFFF3E7CB), RoundedCornerShape(10.dp))
            .border(2.dp, GoldBevelDark, RoundedCornerShape(10.dp))
            .clickable(enabled = !leaving) { leaving = true; onDone() }
            .padding(horizontal = 10.dp, vertical = 8.dp)
            .semantics { contentDescription = bannerLabel }
    ) {
        PersonAvatar(show.avatarId, online = true, size = 34.dp)
        Text(
            text = bannerLabel,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
            color = Color(0xFF3A2515),
            maxLines = 2,
            modifier = Modifier.weight(1f).padding(horizontal = 8.dp).clickable(enabled = !leaving) { onOpenPerson() }
        )
        Text(
            text = stringResource(R.string.notif_poke_back),
            style = MaterialTheme.typography.labelLarge,
            color = if (show.canPokeBack) Color.White else Color(0xFF3A2515).copy(alpha = 0.45f),
            modifier = Modifier
                .background(if (show.canPokeBack) Color(0xFF8A1F2B) else Color.Transparent, RoundedCornerShape(6.dp))
                .border(1.dp, if (show.canPokeBack) GoldBevelLight else Color.Transparent, RoundedCornerShape(6.dp))
                .clickable(enabled = show.canPokeBack && !leaving) { onPokeBack(); leaving = true; onDone() }
                .padding(horizontal = 9.dp, vertical = 5.dp)
        )
    }
}

/** The `offset` the host applies to its page content while a poke shivers it. */
fun shakeOffset(shake: Animatable<Float, *>): IntOffset = IntOffset(shake.value.roundToInt(), 0)
