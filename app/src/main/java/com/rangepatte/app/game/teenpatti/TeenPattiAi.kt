package com.rangepatte.app.game.teenpatti

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import kotlin.math.ln
import kotlin.random.Random

/** The computer's betting: how strong its hand is decides whether it stays blind, calls, raises, shows or packs. */
object TeenPattiAi {
    /** 0.0 (worst) to 1.0 (best): how good a hand is, for betting decisions. */
    fun strength(cards: List<PlayingCard>): Double {
        val rank = TeenPattiRanking.evaluate(cards)
        return when (rank.category) {
            HandCategory.TRAIL -> 1.0
            HandCategory.PURE_SEQUENCE -> 0.95
            HandCategory.SEQUENCE -> 0.85
            HandCategory.COLOR -> 0.70
            HandCategory.PAIR -> 0.40 + 0.20 * rank.tiebreak[0] / 14.0
            HandCategory.HIGH_CARD -> 0.05 + 0.30 * rank.tiebreak[0] / 14.0
        }
    }

    /** Performs the AI seat's turn (possibly looking at its cards first) and returns the new position. */
    fun takeAction(state: TpState, difficulty: AiDifficulty, random: Random = Random.Default): TpState {
        var s = state
        val risk = state.stake / TeenPattiEngine.BOOT // 1, 2, 4, ... 64

        // Decide whether to look at the cards: the higher the stake, the more likely.
        val seeChance = when {
            state.activeCount == 2 -> 1.0
            risk >= 8 -> 0.95
            risk >= 4 -> 0.6
            risk >= 2 -> 0.35
            else -> 0.2
        }
        if (!s.current.seen && random.nextDouble() < seeChance) s = TeenPattiEngine.see(s) ?: s

        val me = s.current
        val cannotAfford = !TeenPattiEngine.canChaal(s)
        if (cannotAfford) {
            return TeenPattiEngine.show(s) ?: TeenPattiEngine.pack(s) ?: s
        }

        // A little unpredictability, more of it on Easy.
        val wild = if (difficulty == AiDifficulty.EASY) 0.2 else if (difficulty == AiDifficulty.MEDIUM) 0.08 else 0.0
        if (random.nextDouble() < wild) {
            val options = buildList<() -> TpState?> {
                add { TeenPattiEngine.chaal(s) }
                add { TeenPattiEngine.pack(s) }
                if (TeenPattiEngine.canRaise(s)) add { TeenPattiEngine.raise(s) }
            }
            options.random(random)()?.let { return it }
        }

        if (!me.seen) {
            // Playing blind: mostly just call; fold only when the stake has run away.
            return when {
                risk >= 16 && random.nextDouble() < 0.3 -> TeenPattiEngine.pack(s)
                TeenPattiEngine.canRaise(s) && risk < 4 && random.nextDouble() < 0.12 -> TeenPattiEngine.raise(s)
                else -> TeenPattiEngine.chaal(s)
            } ?: s
        }

        val strength = strength(me.hand)
        val packBelow = 0.22 + 0.07 * (ln(risk.toDouble()) / ln(2.0))
        return when {
            strength < packBelow && random.nextDouble() < 0.85 -> TeenPattiEngine.pack(s)
            TeenPattiEngine.canShow(s) && strength > 0.55 && random.nextDouble() < 0.4 -> TeenPattiEngine.show(s)
            TeenPattiEngine.canShow(s) && strength < 0.4 && risk >= 4 -> TeenPattiEngine.pack(s)
            strength > 0.8 && TeenPattiEngine.canRaise(s) && random.nextDouble() < 0.4 -> TeenPattiEngine.raise(s)
            else -> TeenPattiEngine.chaal(s)
        } ?: s
    }
}
