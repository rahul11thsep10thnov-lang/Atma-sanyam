package com.rangepatte.app.game.dehlapakad

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.tricks.TrickActionCodec
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.cardInHand
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

object DehlaPakadMachine : GameMachine<DpState, TrickAction> {
    override val gameId = GameId.DEHLA_PAKAD
    override val botDelayMs = 800L

    override fun start(config: MatchConfig, random: Random) = DehlaPakadEngine.newMatch(random)

    override fun apply(state: DpState, action: TrickAction, seat: Int, random: Random): DpState? = when (action) {
        is TrickAction.Play -> {
            val card = cardInHand(state.round.hands[seat], action.cardId)
            if (card == null || state.phase != DpPhase.PLAYING || state.round.turn != seat) null else DehlaPakadEngine.play(state, card)
        }
        // Naming trump is the move of the first player who cannot follow suit.
        is TrickAction.Trump ->
            if (state.phase == DpPhase.PLAYING && seat == state.round.turn && DehlaPakadEngine.needsTrumpCall(state)) DehlaPakadEngine.callTrump(state, action.suit) else null
        TrickAction.Next -> when {
            seat != 0 -> null
            state.phase == DpPhase.ROUND_OVER -> DehlaPakadEngine.nextRound(state, random)
            state.phase == DpPhase.MATCH_OVER -> DehlaPakadEngine.newMatch(random)
            else -> null
        }
        is TrickAction.Bid -> null
    }

    override fun seatToAct(state: DpState): Int? = when (state.phase) {
        DpPhase.PLAYING -> if (TrickEngine.isTrickComplete(state.round)) null else state.round.turn
        else -> 0
    }

    override fun autoStep(state: DpState): DpState? =
        if (state.phase == DpPhase.PLAYING && TrickEngine.isTrickComplete(state.round)) DehlaPakadEngine.resolveTrick(state) else null

    override fun decideForBot(state: DpState, seat: Int, difficulty: AiDifficulty, random: Random): TrickAction? = when {
        state.phase != DpPhase.PLAYING -> TrickAction.Next
        DehlaPakadEngine.needsTrumpCall(state) -> TrickAction.Trump(DehlaPakadAi.chooseTrump(state))
        else -> TrickAction.Play(DehlaPakadAi.chooseCard(state, difficulty, random).id)
    }

    override fun encode(action: TrickAction) = TrickActionCodec.encode(action)
    override fun decode(text: String) = TrickActionCodec.decode(text)
}
