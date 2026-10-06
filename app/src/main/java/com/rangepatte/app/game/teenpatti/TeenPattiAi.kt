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

    /**
     * The next thing the seat on turn does. Looking at the cards ([TpAction.SEE]) is its own step; the
     * computer is then asked again and chooses its bet.
     */
    fun decide(state: TpState, difficulty: AiDifficulty, random: Random = Random.Default): TpAction {
        val me = state.current
        val risk = state.stake / TeenPattiEngine.BOOT // 1, 2, 4, ... 64

        // Decide whether to look at the cards: the higher the stake, the more likely.
        val seeChance = when {
            state.activeCount == 2 -> 1.0
            risk >= 8 -> 0.95
            risk >= 4 -> 0.6
            risk >= 2 -> 0.35
            else -> 0.2
        }
        if (!me.seen && random.nextDouble() < seeChance) return TpAction.SEE

        fun allowed(a: TpAction) = TeenPattiEngine.act(state, a) != null
        fun firstAllowed(vararg choices: TpAction) = choices.firstOrNull(::allowed) ?: TpAction.PACK

        if (!TeenPattiEngine.canChaal(state)) return firstAllowed(TpAction.SHOW, TpAction.PACK)

        // A little unpredictability, more of it on Easy.
        val wild = when (difficulty) { AiDifficulty.EASY -> 0.2; AiDifficulty.MEDIUM -> 0.08; AiDifficulty.HARD -> 0.0 }
        if (random.nextDouble() < wild) {
            val options = listOf(TpAction.CHAAL, TpAction.PACK, TpAction.RAISE).filter(::allowed)
            if (options.isNotEmpty()) return options.random(random)
        }

        if (!me.seen) {
            // Playing blind: mostly just call; fold only when the stake has run away.
            return when {
                risk >= 16 && random.nextDouble() < 0.3 -> TpAction.PACK
                TeenPattiEngine.canRaise(state) && risk < 4 && random.nextDouble() < 0.12 -> TpAction.RAISE
                else -> TpAction.CHAAL
            }
        }

        val strength = strength(me.hand)
        val packBelow = 0.22 + 0.07 * (ln(risk.toDouble()) / ln(2.0))
        return when {
            strength < packBelow && random.nextDouble() < 0.85 -> TpAction.PACK
            TeenPattiEngine.canShow(state) && strength > 0.55 && random.nextDouble() < 0.4 -> TpAction.SHOW
            TeenPattiEngine.canShow(state) && strength < 0.4 && risk >= 4 -> TpAction.PACK
            strength > 0.8 && TeenPattiEngine.canRaise(state) && random.nextDouble() < 0.4 -> TpAction.RAISE
            else -> TpAction.CHAAL
        }
    }

    /** One computer action applied to [state] (used by tests and simulations). */
    fun takeAction(state: TpState, difficulty: AiDifficulty, random: Random = Random.Default): TpState {
        val action = decide(state, difficulty, random)
        return TeenPattiEngine.act(state, action) ?: TeenPattiEngine.pack(state) ?: state
    }
}
