package com.rangepatte.app.game.coatpiece

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.tricks.TrickActionCodec
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.cardInHand
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

object CoatPieceMachine : GameMachine<CpState, TrickAction> {
    override val gameId = GameId.COAT_PIECE
    override val botDelayMs = 800L

    override fun start(config: MatchConfig, random: Random) = CoatPieceEngine.newMatch(random)

    override fun apply(state: CpState, action: TrickAction, seat: Int, random: Random): CpState? = when (action) {
        is TrickAction.Play -> {
            val card = cardInHand(state.round.hands[seat], action.cardId)
            if (card == null || state.phase != CpPhase.PLAYING || state.round.turn != seat) null
            else CoatPieceEngine.play(state, card)
        }
        is TrickAction.Trump ->
            if (state.phase == CpPhase.TRUMP_CALL && seat == state.caller) CoatPieceEngine.callTrump(state, action.suit) else null
        TrickAction.Next -> when {
            seat != 0 -> null
            state.phase == CpPhase.ROUND_OVER -> CoatPieceEngine.nextRound(state, random)
            state.phase == CpPhase.MATCH_OVER -> CoatPieceEngine.newMatch(random)
            else -> null
        }
        is TrickAction.Bid -> null
    }

    override fun seatToAct(state: CpState): Int? = when (state.phase) {
        CpPhase.TRUMP_CALL -> state.caller
        CpPhase.PLAYING -> if (TrickEngine.isTrickComplete(state.round)) null else state.round.turn
        CpPhase.ROUND_OVER, CpPhase.MATCH_OVER -> 0
    }

    override fun autoStep(state: CpState): CpState? =
        if (state.phase == CpPhase.PLAYING && TrickEngine.isTrickComplete(state.round)) CoatPieceEngine.resolveTrick(state) else null

    override fun decideForBot(state: CpState, seat: Int, difficulty: AiDifficulty, random: Random): TrickAction? = when (state.phase) {
        CpPhase.TRUMP_CALL -> TrickAction.Trump(CoatPieceAi.chooseTrump(state))
        CpPhase.PLAYING -> TrickAction.Play(CoatPieceAi.chooseCard(state, difficulty, random).id)
        else -> TrickAction.Next
    }

    override fun encode(action: TrickAction) = TrickActionCodec.encode(action)
    override fun decode(text: String) = TrickActionCodec.decode(text)
}
