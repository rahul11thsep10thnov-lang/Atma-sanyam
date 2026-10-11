package com.rangepatte.app.domain.notifications

/** What the notification centre can tell a player about (Element 12). Nothing else, no marketing. */
enum class NoticeKind { FRIEND_REQUEST, REQUEST_ACCEPTED, PLAY_REQUEST, POKE, FRIEND_ONLINE, SEATED }

/**
 * One line in the centre. [id] is stable for the thing it is about ("fr:<uid>", "pr:<requestId>"), so a
 * notice is never listed twice. [uid] is the other person. [live] is false once the thing it is about is
 * over (a request answered, a play request expired): the line stays, its action goes.
 */
data class Notice(
    val id: String,
    val kind: NoticeKind,
    val uid: String,
    val at: Long,
    val read: Boolean = false,
    val live: Boolean = true,
    /** Extra reference for the action: the play request id, or the table code. */
    val ref: String? = null
)

/** The pure rules: what is kept, what counts as unread, how the list is grouped. */
object NoticeBook {
    const val KEEP_MS = 7 * 24 * 60 * 60 * 1000L
    const val MAX_ITEMS = 50

    /**
     * Folds freshly derived notices into the kept list: a known id keeps its read flag and first time,
     * takes the new liveness; a derived notice no longer present goes dead (its action is gone) but is
     * kept; dismissed ids are dropped. Then the 7-day and 50-item limits, newest first.
     */
    fun merge(kept: List<Notice>, derived: List<Notice>, dismissed: Set<String>, now: Long): List<Notice> {
        val byId = LinkedHashMap<String, Notice>()
        kept.forEach { byId[it.id] = it }
        val derivedIds = derived.map { it.id }.toSet()
        derived.forEach { d ->
            val old = byId[d.id]
            byId[d.id] = if (old == null) d else old.copy(live = d.live, ref = d.ref ?: old.ref)
        }
        // A derived kind that is no longer derived is over: keep the line, drop its action.
        kept.filter { it.kind in DERIVED_KINDS && it.id !in derivedIds && it.live }.forEach { byId[it.id] = it.copy(live = false) }
        return byId.values
            .filter { it.id !in dismissed && now - it.at <= KEEP_MS }
            .sortedByDescending { it.at }
            .take(MAX_ITEMS)
    }

    /** Kinds that come from watching another collection (the rest are posted once, e.g. "you have a seat"). */
    val DERIVED_KINDS = setOf(NoticeKind.FRIEND_REQUEST, NoticeKind.REQUEST_ACCEPTED, NoticeKind.PLAY_REQUEST)

    fun unreadCount(notices: List<Notice>) = notices.count { !it.read }

    fun markAllRead(notices: List<Notice>) = notices.map { if (it.read) it else it.copy(read = true) }

    /** The centre shows "New" (unread when it was opened) above "Earlier". */
    fun split(notices: List<Notice>, newIds: Set<String>): Pair<List<Notice>, List<Notice>> =
        notices.partition { it.id in newIds }
}
