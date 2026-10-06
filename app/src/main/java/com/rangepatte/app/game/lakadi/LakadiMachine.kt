package com.rangepatte.app.game.lakadi

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.tricks.TrickActionCodec
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.cardInHand
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

object LakadiMachine : GameMachine<LkState, TrickAction> {
    override val gameId = GameId.LAKADI
    override val botDelayMs = 800L

    override fun start(config: MatchConfig, random: Random) = LakadiEngine.newGame(random)

    override fun apply(state: LkState, action: TrickAction, seat: Int, random: Random): LkState? = when (action) {
        is TrickAction.Bid -> if (state.phase == LkPhase.BIDDING && seat == state.bidTurn) LakadiEngine.bid(state, action.amount) else null
        is TrickAction.Play -> {
            val card = cardInHand(state.round.hands[seat], action.cardId)
            if (card == null || state.phase != LkPhase.PLAYING || state.round.turn != seat) null else LakadiEngine.play(state, card)
        }
        TrickAction.Next -> when {
            seat != 0 -> null
            state.phase == LkPhase.HAND_OVER -> LakadiEngine.nextHand(state, random)
            state.phase == LkPhase.GAME_OVER -> LakadiEngine.newGame(random)
            else -> null
        }
        is TrickAction.Trump -> null
    }

    override fun seatToAct(state: LkState): Int? = when (state.phase) {
        LkPhase.BIDDING -> state.bidTurn
        LkPhase.PLAYING -> if (TrickEngine.isTrickComplete(state.round)) null else state.round.turn
        LkPhase.HAND_OVER, LkPhase.GAME_OVER -> 0
    }

    override fun autoStep(state: LkState): LkState? =
        if (state.phase == LkPhase.PLAYING && TrickEngine.isTrickComplete(state.round)) LakadiEngine.resolveTrick(state) else null

    override fun decideForBot(state: LkState, seat: Int, difficulty: AiDifficulty, random: Random): TrickAction? = when (state.phase) {
        LkPhase.BIDDING -> TrickAction.Bid(LakadiAi.bid(state, difficulty, random))
        LkPhase.PLAYING -> TrickAction.Play(LakadiAi.chooseCard(state, difficulty, random).id)
        else -> TrickAction.Next
    }

    override fun encode(action: TrickAction) = TrickActionCodec.encode(action)
    override fun decode(text: String) = TrickActionCodec.decode(text)
}
