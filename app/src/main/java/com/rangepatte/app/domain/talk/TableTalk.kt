package com.rangepatte.app.domain.talk

/**
 * Predefined table talk (Friends Element 11, approved Design 1). Nothing is ever typed: a message is
 * the id of one fixed phrase or emoji, so every phone shows it in its own language and there is
 * nothing to moderate. Pure rules only; the screens and the session do the sending.
 */
object TableTalk {
    /** Phrase ids 0–9; the text for each lives in the string resources (`talk_phrase_N`). */
    const val PHRASE_COUNT = 10
    /** Emoji ids start here; the glyph is fixed, the spoken label is a string resource. */
    const val EMOJI_BASE = 100
    val EMOJI = listOf("👍", "😂", "😮", "🙏", "🔥", "😢", "❤️", "🃏")

    fun isPhrase(id: Int) = id in 0 until PHRASE_COUNT
    fun isEmoji(id: Int) = id in EMOJI_BASE until EMOJI_BASE + EMOJI.size
    fun isValid(id: Int) = isPhrase(id) || isEmoji(id)
    fun emojiOf(id: Int): String? = if (isEmoji(id)) EMOJI[id - EMOJI_BASE] else null

    /** How long a received message stays beside the sender's nameplate. */
    const val SHOW_MS = 3_000L
    /** At most one message every [MIN_GAP_MS], and at most [BURST_MAX] in any [BURST_WINDOW_MS]. */
    const val MIN_GAP_MS = 2_000L
    const val BURST_MAX = 5
    const val BURST_WINDOW_MS = 30_000L

    /**
     * Whether a message may be sent now given the times of earlier sends (any order). The host
     * applies the same rule to what it relays, so a modified phone cannot flood the table.
     */
    fun canSend(sentAt: List<Long>, now: Long): Boolean {
        if (sentAt.any { now - it < MIN_GAP_MS }) return false
        return sentAt.count { now - it < BURST_WINDOW_MS } < BURST_MAX
    }

    /** Watchers may react with emoji but not speak phrases. */
    fun allowedFor(isSpectator: Boolean, id: Int): Boolean = isValid(id) && (!isSpectator || isEmoji(id))
}

/** One message at the table: who sent it (a seat, or [TableMessage.WATCHER] with a name) and when. */
data class TableMessage(val seat: Int, val id: Int, val name: String, val at: Long) {
    companion object { const val WATCHER = -1 }
}
