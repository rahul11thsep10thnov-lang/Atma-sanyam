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

    /**
     * Host → everyone: who is at the table right now, how many seats it has, and the game's settings
     * ([MatchConfig.options], so a Ludo guest sees the house rules before the start).
     */
    data class Lobby(val names: List<String>, val seats: Int = 0, val options: String = "") : Wire

    /**
     * Host → one client: the game begins; you sit at [yourSeat]. A spectator gets seat
     * [SessionCore.SPECTATOR] and a config with a blank seed (the real seed would reveal every deal).
     */
    data class Start(val config: MatchConfig, val yourSeat: Int) : Wire

    /** Client → host: "I'd like to make this move." */
    data class Act(val action: String) : Wire

    /** Host → everyone: move number [seq] was made by [seat]. Every phone applies it in order. */
    data class Do(val seq: Int, val seat: Int, val action: String) : Wire

    /** Host → everyone: [seat]'s player has left; the computer plays that seat now. */
    data class Bot(val seat: Int) : Wire

    /**
     * Host → one spectator: the whole game as it stands after move [seq], with every hand hidden
     * ([GameMachine.redact] for seat null). Sent after every step, because a spectator cannot replay
     * moves on a view with hidden cards.
     */
    data class View(val seq: Int, val state: String) : Wire

    /**
     * Host → one spectator: you now sit at [seat]. [state] is the full game after move [seq] and [seed]
     * the match's real seed (spectators were given a blank one), so this phone can follow the lockstep
     * like any other player from here on.
     */
    data class Seat(val seat: Int, val seq: Int, val seed: Long, val state: String) : Wire

    /** Host → everyone: [seat], until now the computer's, is played by a person called [name]. */
    data class Human(val seat: Int, val name: String) : Wire

    /**
     * Table talk (Element 11): a predefined phrase or emoji by id. Client → host with any seat; the host
     * relays it to everyone with the real [seat] (or -1 and the watcher's [name] for a spectator).
     */
    data class Say(val seat: Int, val id: Int, val name: String = "") : Wire

    /** Anyone: I am leaving / the table is closed. */
    data object Leave : Wire

    fun encode(): String = when (this) {
        is Join -> "JOIN|${esc(name)}"
        is Reject -> "REJECT|${esc(reason)}"
        is Lobby -> "LOBBY|" + names.joinToString(",") { esc(it) } + "|$seats|${esc(options)}"
        is Start -> "START|${config.gameId.name}|${config.difficulty.name}|${config.seed}|$yourSeat|" +
            config.seatNames.joinToString(",") { esc(it) } + "|" + config.humanSeats.sorted().joinToString(",") + "|" + esc(config.options)
        is Act -> "ACT|${esc(action)}"
        is Do -> "DO|$seq|$seat|${esc(action)}"
        is Bot -> "BOT|$seat"
        is View -> "VIEW|$seq|${esc(state)}"
        is Seat -> "SEAT|$seat|$seq|$seed|${esc(state)}"
        is Human -> "HUMAN|$seat|${esc(name)}"
        is Say -> "SAY|$seat|$id|${esc(name)}"
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
                "LOBBY" -> Lobby(if (p[1].isEmpty()) emptyList() else p[1].split(",").map(::unesc), p.getOrNull(2)?.toIntOrNull() ?: 0, p.getOrNull(3)?.let(::unesc).orEmpty())
                "START" -> Start(
                    MatchConfig(
                        gameId = GameId.valueOf(p[1]),
                        difficulty = AiDifficulty.valueOf(p[2]),
                        seed = p[3].toLong(),
                        seatNames = p[5].split(",").map(::unesc),
                        humanSeats = if (p[6].isEmpty()) emptySet() else p[6].split(",").map { it.toInt() }.toSet(),
                        // Older phones send no options field; an empty one means the game's defaults.
                        options = p.getOrNull(7)?.let(::unesc).orEmpty()
                    ),
                    yourSeat = p[4].toInt()
                )
                "ACT" -> Act(unesc(p[1]))
                "DO" -> Do(p[1].toInt(), p[2].toInt(), unesc(p[3]))
                "BOT" -> Bot(p[1].toInt())
                "VIEW" -> View(p[1].toInt(), unesc(p[2]))
                "SEAT" -> Seat(p[1].toInt(), p[2].toInt(), p[3].toLong(), unesc(p[4]))
                "HUMAN" -> Human(p[1].toInt(), unesc(p[2]))
                "SAY" -> Say(p[1].toInt(), p[2].toInt(), p.getOrNull(3)?.let(::unesc).orEmpty())
                "LEAVE" -> Leave
                else -> null
            }
        }.getOrNull()
    }
}
