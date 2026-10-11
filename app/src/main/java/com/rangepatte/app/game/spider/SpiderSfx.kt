package com.rangepatte.app.game.spider

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.audio.SfxSequences

/** The card sounds of Spider: which effects one accepted move deserves. Pure, so it can be tested. */
object SpiderSfx {
    private fun SpiderState.faceDown(): Int = tableau.sumOf { column -> column.count { !it.faceUp } }

    fun forMove(move: SpiderMove, before: SpiderState, after: SpiderState): List<SfxCue> = buildList {
        when (move) {
            // Ten cards go out at once: a dealing run.
            SpiderMove.Deal -> add(SfxCue(Sfx.DEAL_MANY))
            is SpiderMove.MoveRun -> {
                add(SfxCue(Sfx.PRESENT))
                if (after.faceDown() < before.faceDown()) add(SfxCue(Sfx.REVEAL, 280))
            }
        }
        // A finished King-to-Ace run is gathered off the table.
        if (after.completed > before.completed) add(SfxCue(Sfx.COLLECT, 450))
        if (after.isWon && !before.isWon) add(SfxCue(Sfx.HAND_REVEAL, 1000))
    }

    fun forNewGame(): List<SfxCue> = SfxSequences.freshMatch()
}
