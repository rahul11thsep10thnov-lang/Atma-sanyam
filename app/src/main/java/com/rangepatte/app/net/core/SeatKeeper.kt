package com.rangepatte.app.net.core

/**
 * The host's book of seats whose player dropped out (stage 8): each is kept for [windowMs] while the
 * computer moves for them. A phone that joins again inside the window — the same peer (an online
 * room keeps the uid), or the same name over a fresh link (Nearby gives a new endpoint) — gets the
 * seat back; after the window the seat stays with the computer. Pure, so it can be tested.
 */
class SeatKeeper(val windowMs: Long = DEFAULT_WINDOW_MS) {
    data class Away(val seat: Int, val name: String, val peerId: String, val deadline: Long)

    private val away = LinkedHashMap<Int, Away>()

    /** Seats kept open right now, by seat. */
    val seats: Map<Int, Away> get() = away

    fun drop(seat: Int, name: String, peerId: String, now: Long): Away =
        Away(seat, name, peerId, now + windowMs).also { away[seat] = it }

    /** The seat a returning phone may take: the same peer first, else the same name; null if none or too late. */
    fun match(peerId: String, name: String, now: Long): Int? {
        val live = away.values.filter { now < it.deadline }
        return (live.firstOrNull { it.peerId == peerId } ?: live.firstOrNull { it.name.equals(name.trim(), ignoreCase = true) })?.seat
    }

    fun reclaim(seat: Int): Away? = away.remove(seat)

    /** Drops the seats whose window has passed and returns them. */
    fun expire(now: Long): List<Int> {
        val gone = away.values.filter { now >= it.deadline }.map { it.seat }
        gone.forEach { away.remove(it) }
        return gone
    }

    fun remainingMs(seat: Int, now: Long): Long? = away[seat]?.let { (it.deadline - now).coerceAtLeast(0) }

    companion object {
        const val DEFAULT_WINDOW_MS = 60_000L
    }
}
