package com.rangepatte.app.data.pokes

import android.content.Context
import androidx.core.content.edit
import com.rangepatte.app.domain.pokes.PokeAudience
import com.rangepatte.app.domain.pokes.PokePrefs
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Poke settings (Element 15), per account, kept on the phone; the parts a sender needs (receive and
 * audience) are mirrored to `profiles/{uid}.pokePrefs` through [mirror] so they can be told politely.
 */
class PokePrefsRepository(context: Context, private val mirror: (uid: String, Map<String, Any>) -> Unit = { _, _ -> }) {
    private val prefs = context.applicationContext.getSharedPreferences("poke_prefs", Context.MODE_PRIVATE)
    private var me: String? = null
    private val _value = MutableStateFlow(PokePrefs())
    val value: StateFlow<PokePrefs> = _value.asStateFlow()

    fun start(uid: String) {
        me = uid
        _value.value = PokePrefs(
            receive = prefs.getBoolean("$uid:receive", true),
            sound = prefs.getBoolean("$uid:sound", true),
            vibration = prefs.getBoolean("$uid:vibration", true),
            audience = runCatching { PokeAudience.valueOf(prefs.getString("$uid:audience", null) ?: "") }.getOrDefault(PokeAudience.ALL_FRIENDS),
            muted = prefs.getStringSet("$uid:muted", emptySet()).orEmpty().toSet(),
            favourites = prefs.getStringSet("$uid:favourites", emptySet()).orEmpty().toSet()
        )
    }

    fun stop() { me = null; _value.value = PokePrefs() }

    fun update(change: (PokePrefs) -> PokePrefs) {
        val uid = me ?: return
        val next = change(_value.value)
        _value.value = next
        prefs.edit {
            putBoolean("$uid:receive", next.receive); putBoolean("$uid:sound", next.sound); putBoolean("$uid:vibration", next.vibration)
            putString("$uid:audience", next.audience.name)
            putStringSet("$uid:muted", next.muted); putStringSet("$uid:favourites", next.favourites)
        }
        mirror(uid, next.mirror())
    }

    fun setMuted(other: String, muted: Boolean) = update { it.copy(muted = if (muted) it.muted + other else it.muted - other) }
    fun setFavourite(other: String, fav: Boolean) = update { it.copy(favourites = if (fav) it.favourites + other else it.favourites - other) }
}
