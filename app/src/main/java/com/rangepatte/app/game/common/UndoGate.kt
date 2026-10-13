package com.rangepatte.app.game.common

/** How a rewarded ad for Undo ended. */
enum class RewardOutcome {
    /** Watched to the end, for at least [UndoGate.MIN_AD_MS]: Undo is unlocked for this game. */
    EARNED,
    /** The ad finished sooner than [UndoGate.MIN_AD_MS] (or was closed early); Undo stays locked. */
    TOO_SHORT,
    /** No ad could be loaded or shown right now. */
    UNAVAILABLE
}

/**
 * Who may press Undo: a member always; anyone else once they have watched a rewarded ad of at least
 * thirty seconds, which unlocks Undo for the rest of that game. The app wires the hooks in at start
 * (membership, the ads manager and the way to the membership page); the game frame asks them.
 */
object UndoGate {
    const val MIN_AD_MS = 30_000L

    /** True while the player is a paid member. */
    var isMember: () -> Boolean = { false }

    /** Shows a rewarded ad and reports how it ended (on the main thread). */
    var showRewardedAd: (onDone: (RewardOutcome) -> Unit) -> Unit = { it(RewardOutcome.UNAVAILABLE) }

    /** Opens the membership page. */
    var openMembership: () -> Unit = {}

    /** The rule itself: an ad counts only when it was watched to the end and lasted long enough. */
    fun outcome(rewarded: Boolean, watchedMs: Long): RewardOutcome = when {
        rewarded && watchedMs >= MIN_AD_MS -> RewardOutcome.EARNED
        else -> RewardOutcome.TOO_SHORT
    }
}
