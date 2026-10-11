package com.rangepatte.app.ui.pokes

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.rangepatte.app.AppServices

/** The Pokes plaque on the Settings page (Element 15, Design 1), wired to the preferences. */
@Composable
fun PokeSettingsContent() {
    val repo = AppServices.pokePrefs
    val prefs by repo.value.collectAsState()
    val people by AppServices.friends.people.collectAsState()
    prefs.muted.filter { people[it] == null }.forEach { uid -> LaunchedEffect(uid) { AppServices.friends.loadPerson(uid) } }
    PokeSettingsPanel(
        prefs = prefs,
        nameOf = { uid -> people[uid]?.username ?: "…" },
        onChange = { change -> repo.update(change) },
        onUnmute = { uid -> repo.setMuted(uid, false) }
    )
}

