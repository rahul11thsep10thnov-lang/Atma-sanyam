package com.rangepatte.app.domain.pokes

/** A "hey, come play" nudge with nothing attached (Element 13). */
data class Poke(val from: String, val to: String, val at: Long)

/** The pure rules: who may poke whom, and how often. The Firestore rule enforces the same cooldown. */
object Pokes {
    /** One poke per friend every ten minutes. */
    const val COOLDOWN_MS = 10 * 60 * 1000L
    /** At most this many pokes in any hour, over all friends. */
    const val HOURLY_MAX = 20
    const val HOUR_MS = 60 * 60 * 1000L

    /** Milliseconds until [other] may be poked again, or 0 if now. */
    fun cooldownLeft(lastPokeTo: Long?, now: Long): Long =
        if (lastPokeTo == null) 0 else (lastPokeTo + COOLDOWN_MS - now).coerceAtLeast(0)

    /**
     * Whether a poke may be sent: only to a friend who is online, only when their cooldown is over,
     * and only under the hourly total.
     */
    fun canPoke(isFriend: Boolean, friendOnline: Boolean, lastPokeTo: Long?, sentAt: List<Long>, now: Long): Boolean =
        isFriend && friendOnline && cooldownLeft(lastPokeTo, now) == 0L && sentAt.count { now - it < HOUR_MS } < HOURLY_MAX

    /** The document id for the one record that is updated per pair and direction. */
    fun docId(from: String, to: String) = "${from}_$to"

    /** "9:58" for the countdown. */
    fun countdown(ms: Long): String {
        val s = (ms + 999) / 1000
        return "%d:%02d".format(s / 60, s % 60)
    }
}
