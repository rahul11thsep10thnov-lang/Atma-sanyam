package com.rangepatte.app.game.teenpatti

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.audio.SfxSequences
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

object TeenPattiMachine : GameMachine<TpState, TpAction> {
    override val gameId = GameId.TEEN_PATTI
    override val botDelayMs = 1100L

    override fun start(config: MatchConfig, random: Random) = TeenPattiEngine.newMatch(config.seatNames, random)

    override fun apply(state: TpState, action: TpAction, seat: Int, random: Random): TpState? {
        if (action == TpAction.NEXT_HAND) {
            if (seat != 0 || state.phase != TpPhase.ENDED) return null
            // If you cannot afford the boot any more the match starts over.
            return TeenPattiEngine.nextHand(state, random) ?: TeenPattiEngine.newMatch(state.seats.map { it.name }, random)
        }
        if (state.phase != TpPhase.BETTING || seat != state.turn) return null
        return TeenPattiEngine.act(state, action)
    }

    override fun seatToAct(state: TpState): Int? = if (state.phase == TpPhase.ENDED) 0 else state.turn

    override fun autoStep(state: TpState): TpState? = null

    override fun decideForBot(state: TpState, seat: Int, difficulty: AiDifficulty, random: Random): TpAction? =
        if (state.phase == TpPhase.ENDED) TpAction.NEXT_HAND else TeenPattiAi.decide(state, difficulty, random)

    override fun sfx(before: TpState, after: TpState, action: TpAction?): List<SfxCue> {
        val showdown = before.phase != TpPhase.ENDED && after.phase == TpPhase.ENDED && after.result?.showdown == true
        return when {
            // Hands turned face up for everyone: the climax of the hand.
            showdown -> listOf(SfxCue(Sfx.HAND_REVEAL))
            action == TpAction.SEE -> listOf(SfxCue(Sfx.REVEAL))
            action == TpAction.PACK -> listOf(SfxCue(Sfx.COLLECT))
            action == TpAction.NEXT_HAND -> SfxSequences.gatherAndDeal()
            else -> emptyList() // chaal / raise move chips, not cards
        }
    }

    override fun encode(action: TpAction) = action.name
    override fun decode(text: String): TpAction? = runCatching { TpAction.valueOf(text) }.getOrNull()
}
