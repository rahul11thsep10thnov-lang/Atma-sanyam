package com.rangepatte.app.game.solitaire

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.audio.SfxSequences

/** The card sounds of Klondike: which effects one accepted move deserves. Pure, so it can be tested. */
object SolitaireSfx {
    private const val REVEAL_AFTER_PLACE_MS = 280L

    private fun SolitaireState.faceDown(): Int = tableau.sumOf { column -> column.count { !it.faceUp } }

    fun forMove(move: SolitaireMove, before: SolitaireState, after: SolitaireState): List<SfxCue> = buildList {
        when (move) {
            // Turning cards from the stock is dealing; turning the waste back over gathers the cards up.
            SolitaireMove.Draw -> add(SfxCue(if (before.stock.isNotEmpty()) Sfx.DEAL_ONE else Sfx.COLLECT))
            else -> {
                add(SfxCue(Sfx.PRESENT))
                // A face-down card that became face-up was turned over by the move.
                if (after.faceDown() < before.faceDown()) add(SfxCue(Sfx.REVEAL, REVEAL_AFTER_PLACE_MS))
            }
        }
        if (after.isWon && !before.isWon) add(SfxCue(Sfx.HAND_REVEAL, 500))
    }

    /** Auto-finish sweeps the remaining cards onto the foundations. */
    fun forAutoFinish(before: SolitaireState, after: SolitaireState): List<SfxCue> = buildList {
        add(SfxCue(Sfx.COLLECT))
        if (after.isWon && !before.isWon) add(SfxCue(Sfx.HAND_REVEAL, 700))
    }

    fun forNewGame(): List<SfxCue> = SfxSequences.freshMatch()
}
