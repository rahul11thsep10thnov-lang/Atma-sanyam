package com.rangepatte.app.domain.friends

/**
 * How two players stand with each other, from one player's point of view. Pure, so the rules of what
 * an action does are the same on every phone and in tests; the store only persists the outcome.
 */
enum class RelationStatus {
    /** Nothing between you. */
    NONE,
    /** You asked; they have not answered. */
    OUTGOING,
    /** They asked you. */
    INCOMING,
    FRIENDS,
    /** You blocked them: they cannot find, ask or poke you. */
    BLOCKED_BY_ME,
    /** They blocked you: shown to you as NONE with every action refused. */
    BLOCKED_ME
}

/** What a player can do to another from a search result or a row. */
enum class RelationAction { ADD_FRIEND, CANCEL_REQUEST, ACCEPT, DECLINE, REMOVE_FRIEND, BLOCK, UNBLOCK }

/** The one relation record for a pair of players, stored once under [pairId]. */
data class Relation(
    val a: String,
    val b: String,
    val kind: Kind,
    /** For PENDING: who asked. For BLOCKED: who blocked. */
    val by: String,
    /** When the record last changed (ms since epoch); 0 when unknown. */
    val since: Long = 0
) {
    enum class Kind { PENDING, FRIENDS, BLOCKED }

    fun involves(uid: String) = uid == a || uid == b
    fun other(uid: String) = if (uid == a) b else a

    /** How [me] sees this relation. */
    fun statusFor(me: String): RelationStatus = when (kind) {
        Kind.FRIENDS -> RelationStatus.FRIENDS
        Kind.PENDING -> if (by == me) RelationStatus.OUTGOING else RelationStatus.INCOMING
        Kind.BLOCKED -> if (by == me) RelationStatus.BLOCKED_BY_ME else RelationStatus.BLOCKED_ME
    }
}

object Relations {
    /** One id per pair, whichever player looks: the smaller uid first. Stops duplicate records. */
    fun pairId(x: String, y: String): String = if (x < y) "${x}_$y" else "${y}_$x"

    /** The main button to show for [status] (null = nothing to do, e.g. they blocked you). */
    fun primaryAction(status: RelationStatus): RelationAction? = when (status) {
        RelationStatus.NONE -> RelationAction.ADD_FRIEND
        RelationStatus.OUTGOING -> RelationAction.CANCEL_REQUEST
        RelationStatus.INCOMING -> RelationAction.ACCEPT
        RelationStatus.FRIENDS -> null
        RelationStatus.BLOCKED_BY_ME -> RelationAction.UNBLOCK
        RelationStatus.BLOCKED_ME -> null
    }

    /**
     * The relation after [me] does [action] to [other], given the [current] record (null = none).
     * Returns null when the action is not allowed in that state — the store must refuse it, never guess.
     * `Result(null)` means the record should be deleted.
     */
    fun apply(current: Relation?, me: String, other: String, action: RelationAction): Outcome? {
        if (me == other) return null
        val status = current?.statusFor(me) ?: RelationStatus.NONE
        fun rel(kind: Relation.Kind, by: String) = Relation(minOf(me, other), maxOf(me, other), kind, by)
        return when (action) {
            RelationAction.ADD_FRIEND -> when (status) {
                RelationStatus.NONE -> Outcome(rel(Relation.Kind.PENDING, me))
                // They asked at the same time: that is a yes from both sides.
                RelationStatus.INCOMING -> Outcome(rel(Relation.Kind.FRIENDS, me))
                else -> null
            }
            RelationAction.CANCEL_REQUEST -> if (status == RelationStatus.OUTGOING) Outcome(null) else null
            RelationAction.ACCEPT -> if (status == RelationStatus.INCOMING) Outcome(rel(Relation.Kind.FRIENDS, me)) else null
            RelationAction.DECLINE -> if (status == RelationStatus.INCOMING) Outcome(null) else null
            RelationAction.REMOVE_FRIEND -> if (status == RelationStatus.FRIENDS) Outcome(null) else null
            RelationAction.BLOCK -> if (status != RelationStatus.BLOCKED_ME) Outcome(rel(Relation.Kind.BLOCKED, me)) else null
            RelationAction.UNBLOCK -> if (status == RelationStatus.BLOCKED_BY_ME) Outcome(null) else null
        }
    }

    /** The record to store, or null to delete it. */
    data class Outcome(val relation: Relation?)
}
