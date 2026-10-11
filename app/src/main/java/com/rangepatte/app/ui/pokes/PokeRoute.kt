package com.rangepatte.app.ui.pokes

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import com.rangepatte.app.AppServices
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.audio.Sfx

/**
 * Shows the poke animation for each poke that arrives while the app is in front (Element 14).
 * [atTable] reduces it to the banner (never over the cards). The host applies [shake] to its content.
 */
@Composable
fun BoxScope.PokeRoute(shake: Animatable<Float, *>, atTable: Boolean, onOpenPerson: (String) -> Unit) {
    val repo = AppServices.pokes
    val incoming by repo.incoming.collectAsState()
    val people by AppServices.friends.people.collectAsState()
    val context = LocalContext.current
    val haptics = LocalHapticFeedback.current
    var show by remember { mutableStateOf<PokeShow?>(null) }

    LaunchedEffect(incoming) {
        val poke = incoming ?: return@LaunchedEffect
        if (people[poke.from] == null) AppServices.friends.loadPerson(poke.from)
        val reduceMotion = runCatching { Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }.getOrDefault(false)
        show = PokeShow(
            key = poke.at,
            fromUid = poke.from,
            name = people[poke.from]?.username ?: "…",
            avatarId = people[poke.from]?.avatarId,
            bannerOnly = atTable,
            reduceMotion = reduceMotion,
            canPokeBack = repo.canPoke(poke.from)
        )
        // One card flick and one haptic tick (Element 15 adds the switches for both).
        GameAudio.play(Sfx.PRESENT)
        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
        repo.acknowledge()
    }
    val current = show ?: return
    PokeOverlay(
        show = current.copy(name = people[current.fromUid]?.username ?: current.name, avatarId = people[current.fromUid]?.avatarId),
        shake = shake,
        onPokeBack = { repo.poke(current.fromUid) },
        onOpenPerson = { onOpenPerson(current.fromUid) },
        onDone = { show = null }
    )
}
