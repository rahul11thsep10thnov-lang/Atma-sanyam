package com.rangepatte.app.domain.pokes

/** Who may poke me (Element 15). */
enum class PokeAudience { ALL_FRIENDS, FAVOURITES, NOBODY }

/** A player's poke settings. Defaults: everything on, all friends. */
data class PokePrefs(
    val receive: Boolean = true,
    val sound: Boolean = true,
    val vibration: Boolean = true,
    val audience: PokeAudience = PokeAudience.ALL_FRIENDS,
    val muted: Set<String> = emptySet(),
    val favourites: Set<String> = emptySet()
) {
    /** Whether a poke from [from] (a friend) should reach this player at all. */
    fun accepts(from: String): Boolean = receive && from !in muted && when (audience) {
        PokeAudience.ALL_FRIENDS -> true
        PokeAudience.FAVOURITES -> from in favourites
        PokeAudience.NOBODY -> false
    }

    /** What is mirrored to the profile so a sender can be told "not taking pokes": receive and audience only. */
    fun mirror(): Map<String, Any> = mapOf("receive" to receive, "audience" to audience.name)
}
