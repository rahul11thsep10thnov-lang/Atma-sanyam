package com.rangepatte.app.net.core

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import java.net.URLDecoder
import java.net.URLEncoder

/**
 * The messages phones send each other, as plain text lines (`KIND|field|field…`). Names are
 * URL-encoded so they may contain any character. The same text travels over Bluetooth/Wi-Fi
 * (Nearby) and over the internet (Firestore).
 */
sealed interface Wire {
    /** Client → host: "I'd like to sit at your table." */
    data class Join(val name: String) : Wire

    /** Host → client: the table is full or already started. */
    data class Reject(val reason: String) : Wire

    /** Host → everyone: who is at the table right now, and how many seats it has (before the game starts). */
    data class Lobby(val names: List<String>, val seats: Int = 0) : Wire

    /** Host → one client: the game begins; you sit at [yourSeat]. */
    data class Start(val config: MatchConfig, val yourSeat: Int) : Wire

    /** Client → host: "I'd like to make this move." */
    data class Act(val action: String) : Wire

    /** Host → everyone: move number [seq] was made by [seat]. Every phone applies it in order. */
    data class Do(val seq: Int, val seat: Int, val action: String) : Wire

    /** Host → everyone: [seat]'s player has left; the computer plays that seat now. */
    data class Bot(val seat: Int) : Wire

    /** Anyone: I am leaving / the table is closed. */
    data object Leave : Wire

    fun encode(): String = when (this) {
        is Join -> "JOIN|${esc(name)}"
        is Reject -> "REJECT|${esc(reason)}"
        is Lobby -> "LOBBY|" + names.joinToString(",") { esc(it) } + "|$seats"
        is Start -> "START|${config.gameId.name}|${config.difficulty.name}|${config.seed}|$yourSeat|" +
            config.seatNames.joinToString(",") { esc(it) } + "|" + config.humanSeats.sorted().joinToString(",")
        is Act -> "ACT|${esc(action)}"
        is Do -> "DO|$seq|$seat|${esc(action)}"
        is Bot -> "BOT|$seat"
        Leave -> "LEAVE"
    }

    companion object {
        private fun esc(s: String) = URLEncoder.encode(s, "UTF-8")
        private fun unesc(s: String) = URLDecoder.decode(s, "UTF-8")

        /** Parses a message, or returns null if it is not one of ours. */
        fun decode(text: String): Wire? = runCatching {
            val p = text.split("|")
            when (p[0]) {
                "JOIN" -> Join(unesc(p[1]))
                "REJECT" -> Reject(unesc(p[1]))
                "LOBBY" -> Lobby(if (p[1].isEmpty()) emptyList() else p[1].split(",").map(::unesc), p.getOrNull(2)?.toIntOrNull() ?: 0)
                "START" -> Start(
                    MatchConfig(
                        gameId = GameId.valueOf(p[1]),
                        difficulty = AiDifficulty.valueOf(p[2]),
                        seed = p[3].toLong(),
                        seatNames = p[5].split(",").map(::unesc),
                        humanSeats = if (p[6].isEmpty()) emptySet() else p[6].split(",").map { it.toInt() }.toSet()
                    ),
                    yourSeat = p[4].toInt()
                )
                "ACT" -> Act(unesc(p[1]))
                "DO" -> Do(p[1].toInt(), p[2].toInt(), unesc(p[3]))
                "BOT" -> Bot(p[1].toInt())
                "LEAVE" -> Leave
                else -> null
            }
        }.getOrNull()
    }
}
