package com.rangepatte.app.game.tricks

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.audio.SfxSequences

/**
 * The card sounds shared by the four trick-taking games. Each game passes in what it knows about one
 * step (the rounds before and after, and whether the round or match was over) and gets back the
 * effects that step deserves:
 *
 * - a card played → the slide of a card placed on the table (or, if it makes the hidden trump
 *   public, the flip of a card revealed);
 * - a finished trick cleared → cards gathered, and if that was the last trick, the hand reveal;
 * - the host starting the next round → shuffle and deal (an opening riffle shuffle after a match).
 */
object TrickSfx {
    /** Delay before the hand reveal when it follows the gathering of the last trick. */
    private const val AFTER_COLLECT_MS = 650L

    fun cues(
        action: TrickAction?,
        before: TrickRound?,
        after: TrickRound?,
        overBefore: Boolean,
        overAfter: Boolean,
        matchOverBefore: Boolean
    ): List<SfxCue> = when (action) {
        null -> buildList {
            val cleared = before != null && after != null &&
                before.plays.size == TrickEngine.SEATS && after.plays.isEmpty()
            if (cleared) add(SfxCue(Sfx.COLLECT))
            if (overAfter && !overBefore) add(SfxCue(Sfx.HAND_REVEAL, if (cleared) AFTER_COLLECT_MS else 0))
        }
        is TrickAction.Play ->
            if (before != null && after != null && !before.trumpActive && after.trumpActive) listOf(SfxCue(Sfx.REVEAL))
            else listOf(SfxCue(Sfx.PRESENT))
        TrickAction.Next -> if (matchOverBefore) SfxSequences.freshMatch() else SfxSequences.newRound()
        is TrickAction.Bid, is TrickAction.Trump -> emptyList()
    }
}
